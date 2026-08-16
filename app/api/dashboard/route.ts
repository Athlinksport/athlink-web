import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { requestId, serverLog } from "@/lib/observability/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DashboardProfile = {
  display_name: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  bio: string | null;
  city_name: string | null;
  country_name: string | null;
  languages: string[] | null;
  looking_for: string[] | null;
};

type OperationName =
  | "authenticate"
  | "current_profile"
  | "user_sports_count"
  | "accepted_connections_count"
  | "eligible_profile_ids"
  | "nearby_athletes_count";

const PROFILE_COLUMNS =
  "display_name, avatar_url, birth_date, bio, city_name, country_name, languages, looking_for";

function logFailure(
  correlationId: string,
  userId: string | null,
  operation: OperationName,
  errorCode: string,
  status: number,
) {
  if (process.env.NODE_ENV !== "development") return;

  serverLog("error", "dashboard_request_failed", {
    requestId: correlationId,
    userId,
    operation,
    supabaseCode: errorCode,
    status,
  });
}

function errorResponse(
  correlationId: string,
  userId: string | null,
  operation: OperationName,
  error: Pick<PostgrestError, "code"> | null,
  status: number,
  code: string,
  message: string,
) {
  logFailure(
    correlationId,
    userId,
    operation,
    error?.code || "UNKNOWN",
    status,
  );

  return NextResponse.json(
    { error: { code, message }, requestId: correlationId },
    { status, headers: { "x-request-id": correlationId } },
  );
}

function getEligibleProfileIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      ids.push(item);
      continue;
    }

    if (
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      typeof item.id === "string"
    ) {
      ids.push(item.id);
      continue;
    }

    return null;
  }

  return [...new Set(ids)];
}

export async function GET(request: Request) {
  const correlationId = requestId(request);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    logFailure(
      correlationId,
      null,
      "authenticate",
      authError?.code || "UNAUTHENTICATED",
      401,
    );
    return NextResponse.json(
      {
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Sign in to view your dashboard.",
        },
        requestId: correlationId,
      },
      { status: 401, headers: { "x-request-id": correlationId } },
    );
  }

  const [profileResult, sportsResult, connectionsResult, eligibilityResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", user.id)
        .maybeSingle<DashboardProfile>(),
      supabase
        .from("user_sports")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("connections")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
      supabase.rpc("list_eligible_connection_profile_ids"),
    ]);

  if (profileResult.error) {
    return errorResponse(
      correlationId,
      user.id,
      "current_profile",
      profileResult.error,
      502,
      "PROFILE_UNAVAILABLE",
      "Your profile details could not be loaded. Please try again.",
    );
  }

  if (sportsResult.error) {
    return errorResponse(
      correlationId,
      user.id,
      "user_sports_count",
      sportsResult.error,
      502,
      "SPORTS_UNAVAILABLE",
      "Your sports summary could not be loaded. Please try again.",
    );
  }

  if (connectionsResult.error) {
    return errorResponse(
      correlationId,
      user.id,
      "accepted_connections_count",
      connectionsResult.error,
      502,
      "CONNECTIONS_UNAVAILABLE",
      "Your connection summary could not be loaded. Please try again.",
    );
  }

  let eligibleProfileIds: string[] | null;
  if (eligibilityResult.error?.code === "PGRST202") {
    if (process.env.NODE_ENV === "development") {
      serverLog("warn", "dashboard_rpc_unavailable", {
        requestId: correlationId,
        userId: user.id,
        operation: "eligible_profile_ids",
        supabaseCode: eligibilityResult.error.code,
        status: 200,
      });
    }

    const compatibleEligibilityResult = await supabase
      .from("profiles")
      .select("id")
      .eq("profile_visibility", "public")
      .neq("id", user.id);

    if (compatibleEligibilityResult.error) {
      return errorResponse(
        correlationId,
        user.id,
        "eligible_profile_ids",
        compatibleEligibilityResult.error,
        503,
        "ELIGIBILITY_UNAVAILABLE",
        "Nearby athlete data is temporarily unavailable. Please try again later.",
      );
    }

    eligibleProfileIds = getEligibleProfileIds(
      compatibleEligibilityResult.data,
    );
  } else if (eligibilityResult.error) {
    return errorResponse(
      correlationId,
      user.id,
      "eligible_profile_ids",
      eligibilityResult.error,
      503,
      "ELIGIBILITY_UNAVAILABLE",
      "Nearby athlete data is temporarily unavailable. Please try again later.",
    );
  } else {
    eligibleProfileIds = getEligibleProfileIds(eligibilityResult.data);
  }

  if (!eligibleProfileIds) {
    return errorResponse(
      correlationId,
      user.id,
      "eligible_profile_ids",
      null,
      502,
      "ELIGIBILITY_RESPONSE_INVALID",
      "Nearby athlete data returned an unsupported response. Please try again later.",
    );
  }

  const profile = profileResult.data;
  let nearbyAthleteCount: number | null = null;

  if (profile?.city_name) {
    nearbyAthleteCount = 0;

    if (eligibleProfileIds.length > 0) {
      let nearbyQuery = supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("id", eligibleProfileIds)
        .eq("city_name", profile.city_name);

      if (profile.country_name) {
        nearbyQuery = nearbyQuery.eq("country_name", profile.country_name);
      }

      const nearbyResult = await nearbyQuery;
      if (nearbyResult.error) {
        return errorResponse(
          correlationId,
          user.id,
          "nearby_athletes_count",
          nearbyResult.error,
          502,
          "NEARBY_ATHLETES_UNAVAILABLE",
          "Nearby athletes could not be counted. Please try again.",
        );
      }

      nearbyAthleteCount = nearbyResult.count ?? 0;
    }
  }

  return NextResponse.json(
    {
      dashboard: {
        profile,
        sportsCount: sportsResult.count ?? 0,
        connectionCount: connectionsResult.count ?? 0,
        nearbyAthleteCount,
      },
      requestId: correlationId,
    },
    { headers: { "x-request-id": correlationId } },
  );
}
