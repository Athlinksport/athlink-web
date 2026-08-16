import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { UUID_PATTERN } from "@/lib/safety/validation";

async function authorize() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const { data: isAdmin, error } = await supabase.rpc("is_current_user_admin");
  if (error) return { response: NextResponse.json({ error: "Administrator authorization could not be verified." }, { status: 503 }) };
  if (!isAdmin) return { response: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) };
  return { supabase, user };
}

export async function GET(request: Request) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;
  const params = new URL(request.url).searchParams;
  const status = params.get("status") ?? "unresolved";
  const targetType = params.get("targetType");
  if (!["unresolved", "reviewing", "resolved", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Invalid report status." }, { status: 400 });
  }
  if (targetType && !["user", "group", "post", "comment", "message"].includes(targetType)) {
    return NextResponse.json({ error: "Invalid report target." }, { status: 400 });
  }
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = 25;
  let query = auth.supabase.from("reports").select("id,reporter_id,target_type,target_id,reason,details,status,moderation_note,reviewed_at,created_at", { count: "exact" }).eq("status", status).order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (targetType) query = query.eq("target_type", targetType);
  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Reports could not be loaded." }, { status: 500 });
  const reportIds = (data ?? []).map((report) => report.id);
  const admin = createSupabaseAdminClient();
  const targetIds = (type: string) => (data ?? [])
    .filter((report) => report.target_type === type)
    .map((report) => report.target_id);
  const [users, groups, posts, comments, messages] = await Promise.all([
    targetIds("user").length ? admin.from("profiles").select("id,display_name").in("id", targetIds("user")) : Promise.resolve({ data: [] }),
    targetIds("group").length ? admin.from("groups").select("id,name").in("id", targetIds("group")) : Promise.resolve({ data: [] }),
    targetIds("post").length ? admin.from("group_posts").select("id,content").in("id", targetIds("post")) : Promise.resolve({ data: [] }),
    targetIds("comment").length ? admin.from("group_post_comments").select("id,content").in("id", targetIds("comment")) : Promise.resolve({ data: [] }),
    targetIds("message").length ? admin.from("messages").select("id,content").in("id", targetIds("message")) : Promise.resolve({ data: [] }),
  ]);
  if ([users, groups, posts, comments, messages].some((result) => "error" in result && result.error)) {
    return NextResponse.json({ error: "Report context could not be loaded." }, { status: 500 });
  }
  const contextById = new Map<string, string>();
  for (const profile of users.data ?? []) contextById.set(profile.id, profile.display_name || "Athlink member");
  for (const group of groups.data ?? []) contextById.set(group.id, group.name);
  for (const item of [...(posts.data ?? []), ...(comments.data ?? []), ...(messages.data ?? [])]) {
    contextById.set(item.id, item.content.slice(0, 240));
  }
  const { data: actions, error: actionsError } = reportIds.length
    ? await auth.supabase.from("moderation_actions").select("id,report_id,action,note,created_at").in("report_id", reportIds).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (actionsError) return NextResponse.json({ error: "Moderation history could not be loaded." }, { status: 500 });
  return NextResponse.json({
    reports: (data ?? []).map((report) => ({
      ...report,
      target_context: contextById.get(report.target_id) ?? null,
      history: (actions ?? []).filter((action) => action.report_id === report.id),
    })),
    count: count ?? 0,
    page,
    pageSize,
  });
}

export async function PATCH(request: Request) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;
  const input = await request.json().catch(() => null) as { reportId?: string; status?: string; note?: string; contentAction?: "remove"; suspendUser?: boolean; restoreUser?: boolean } | null;
  const requestedActions = Number(Boolean(input?.contentAction)) + Number(Boolean(input?.suspendUser)) + Number(Boolean(input?.restoreUser));
  if (!input?.reportId || !UUID_PATTERN.test(input.reportId) || !["reviewing", "resolved", "dismissed"].includes(input.status ?? "") || (input.note?.length ?? 0) > 2000 || requestedActions > 1) return NextResponse.json({ error: "Invalid moderation update." }, { status: 400 });
  const { data: report, error: reportError } = await auth.supabase.from("reports").select("id,target_type,target_id").eq("id", input.reportId).single();
  if (reportError && reportError.code !== "PGRST116") return NextResponse.json({ error: "Report could not be loaded." }, { status: 500 });
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  const admin = createSupabaseAdminClient();
  let action: "report_status" | "user_suspend" | "user_restore" | "content_hide" = "report_status";
  if (input.suspendUser && report.target_type === "user") {
    const { error: suspensionError } = await admin.from("user_suspensions").upsert({ user_id: report.target_id, reason: input.note?.trim() || "Administrative suspension", suspended_by: auth.user.id });
    if (suspensionError) return NextResponse.json({ error: "User suspension could not be recorded." }, { status: 502 });
    const { error: banError } = await admin.auth.admin.updateUserById(report.target_id, { ban_duration: "876000h" });
    if (banError) {
      const { error: rollbackError } = await admin.from("user_suspensions").delete().eq("user_id", report.target_id);
      return NextResponse.json({ error: rollbackError ? "User authentication suspension failed, and its database record could not be rolled back." : "User authentication could not be suspended." }, { status: 502 });
    }
    action = "user_suspend";
  } else if (input.restoreUser && report.target_type === "user") {
    const { error: restoreAuthError } = await admin.auth.admin.updateUserById(report.target_id, { ban_duration: "none" });
    if (restoreAuthError) return NextResponse.json({ error: "User authentication could not be restored." }, { status: 502 });
    const { error: restoreRecordError } = await admin.from("user_suspensions").delete().eq("user_id", report.target_id);
    if (restoreRecordError) {
      const { error: rollbackError } = await admin.auth.admin.updateUserById(report.target_id, { ban_duration: "876000h" });
      return NextResponse.json({ error: rollbackError ? "The login was restored, but the suspension record could not be cleared or the authentication change rolled back." : "User suspension record could not be cleared; the authentication change was rolled back." }, { status: 502 });
    }
    action = "user_restore";
  } else if (input.contentAction === "remove" && ["group", "post", "comment"].includes(report.target_type)) {
    const table = report.target_type === "group" ? "groups" : report.target_type === "post" ? "group_posts" : "group_post_comments";
    const { data: removed, error: removalError } = await admin.from(table).delete().eq("id", report.target_id).select("id").maybeSingle();
    if (removalError) return NextResponse.json({ error: "Reported content could not be removed." }, { status: 502 });
    if (!removed) return NextResponse.json({ error: "Reported content no longer exists, so no removal was recorded." }, { status: 409 });
    action = "content_hide";
  }

  const now = new Date().toISOString();
  const { data: auditRecord, error: auditError } = await auth.supabase.from("moderation_actions").insert({ admin_id: auth.user.id, action, target_type: report.target_type, target_id: report.target_id, report_id: report.id, note: input.note?.trim() || null }).select("id").single();
  if (auditError) return NextResponse.json({ error: "The action completed, but its audit record could not be saved." }, { status: 500 });
  const { data: updatedReport, error: updateError } = await auth.supabase.from("reports").update({ status: input.status, moderation_note: input.note?.trim() || null, reviewed_by: auth.user.id, reviewed_at: now, updated_at: now }).eq("id", report.id).select("id").maybeSingle();
  if (updateError || !updatedReport) {
    const { error: auditRollbackError } = await admin.from("moderation_actions").delete().eq("id", auditRecord.id);
    return NextResponse.json({ error: auditRollbackError ? "The action completed, but the report status and audit rollback both failed." : "The action completed, but the report status could not be updated." }, { status: 500 });
  }
  return NextResponse.json({ updated: true });
}
