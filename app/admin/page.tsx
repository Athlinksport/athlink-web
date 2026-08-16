"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Report = { id: string; target_type: string; target_id: string; target_context: string | null; reason: string; details: string | null; status: string; created_at: string; history: Array<{ id: string; action: string; note: string | null; created_at: string }> };

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState("unresolved");
  const [targetType, setTargetType] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const response = await fetch(`/api/admin/reports?status=${status}&targetType=${targetType}&page=${page}`, { cache: "no-store" });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok || !result) return setError(result?.error ?? "Reports could not be loaded.");
    setReports(result.reports); setCount(result.count);
  }, [page, status, targetType]);
  useEffect(() => {
    // Loading is intentionally synchronized with the active queue filters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function update(report: Report, nextStatus: string, contentAction?: "remove", userAction?: "suspend" | "restore") {
    const note = window.prompt("Moderation note (optional)") ?? "";
    setUpdatingReportId(report.id);
    setError("");
    const response = await fetch("/api/admin/reports", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ reportId: report.id, status: nextStatus, note, contentAction, suspendUser: userAction === "suspend", restoreUser: userAction === "restore" }) });
    const result = await response.json().catch(() => null);
    setUpdatingReportId(null);
    if (!response.ok) setError(result?.error ?? "Moderation action failed."); else void load();
  }
  return <main className="mx-auto w-full max-w-6xl px-4 py-10"><header className="flex items-center gap-3"><ShieldCheck className="text-lime-300" /><div><h1 className="text-3xl font-bold">Moderation</h1><p className="text-muted-foreground">Minimal report context and recorded actions.</p></div></header><div className="mt-7 flex flex-wrap gap-3"><select aria-label="Report status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl bg-slate-900 p-3"><option value="unresolved">Unresolved</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select><select aria-label="Target type" value={targetType} onChange={(event) => { setTargetType(event.target.value); setPage(1); }} className="rounded-xl bg-slate-900 p-3"><option value="">All targets</option>{["user","group","post","comment","message"].map((value) => <option key={value}>{value}</option>)}</select></div>{loading ? <p role="status" className="mt-10">Loading reports…</p> : error ? <div className="mt-10"><p role="alert" className="text-red-300">{error}</p><Button className="mt-3" onClick={() => void load()}>Retry</Button></div> : reports.length === 0 ? <p className="mt-10 rounded-2xl border border-white/10 p-8 text-center text-muted-foreground">No reports match these filters.</p> : <ul className="mt-7 space-y-4">{reports.map((report) => <li key={report.id} className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold capitalize">{report.target_type}: {report.reason.replaceAll("_", " ")}</h2><time className="text-sm text-muted-foreground">{new Date(report.created_at).toLocaleString()}</time></div><p className="mt-2 break-all text-xs text-muted-foreground">Target {report.target_id}</p>{report.target_context && <p className="mt-3 rounded-xl bg-black/20 p-3 text-sm">{report.target_context}</p>}{report.details && <p className="mt-3">{report.details}</p>} {report.history.length > 0 && <div className="mt-4 border-t border-white/10 pt-3"><h3 className="text-sm font-semibold">History</h3><ul className="mt-2 space-y-1 text-xs text-muted-foreground">{report.history.map((entry) => <li key={entry.id}>{entry.action.replaceAll("_", " ")} · {new Date(entry.created_at).toLocaleString()}{entry.note ? ` · ${entry.note}` : ""}</li>)}</ul></div>}<div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={updatingReportId === report.id} onClick={() => void update(report, "reviewing")}>Reviewing</Button><Button size="sm" disabled={updatingReportId === report.id} onClick={() => void update(report, "resolved")}>Resolve</Button><Button size="sm" variant="ghost" disabled={updatingReportId === report.id} onClick={() => void update(report, "dismissed")}>Dismiss</Button>{["group","post","comment"].includes(report.target_type) && <Button size="sm" variant="destructive" disabled={updatingReportId === report.id} onClick={() => void update(report, "resolved", "remove")}>Remove content</Button>}{report.target_type === "user" && <><Button size="sm" variant="destructive" disabled={updatingReportId === report.id} onClick={() => void update(report, "resolved", undefined, "suspend")}>Suspend user</Button><Button size="sm" variant="outline" disabled={updatingReportId === report.id} onClick={() => void update(report, "resolved", undefined, "restore")}>Restore user</Button></>}</div></li>)}</ul>}<div className="mt-6 flex items-center gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm">Page {page} · {count} reports</span><Button variant="outline" disabled={page * 25 >= count} onClick={() => setPage((value) => value + 1)}>Next</Button></div></main>;
}
