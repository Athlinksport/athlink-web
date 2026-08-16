"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { REPORT_REASONS, type ReportTarget } from "@/lib/safety/validation";

export function ReportDialog({ targetType, targetId, label = "Report" }: { targetType: ReportTarget; targetId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setStatus("");
    const response = await fetch("/api/safety/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType, targetId, reason, details }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setStatus(result.error ?? "Report could not be submitted.");
    setStatus("Report submitted. Thank you for helping keep Athlink safe.");
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button variant="outline" size="sm" />}><Flag />{label}</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Report {targetType}</DialogTitle><DialogDescription>Moderators receive only the context needed to review this report.</DialogDescription></DialogHeader><label htmlFor={`reason-${targetId}`}>Reason</label><select id={`reason-${targetId}`} value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3"><option value="">Choose a reason</option>{REPORT_REASONS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select><label htmlFor={`details-${targetId}`}>Additional details (optional)</label><textarea id={`details-${targetId}`} maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} className="min-h-24 rounded-xl border border-white/10 bg-slate-950 p-3" /><p className="text-xs text-muted-foreground">{details.length}/500</p>{status && <p role="status" className="text-sm">{status}</p>}<Button disabled={!reason || busy || status.startsWith("Report submitted")} onClick={() => void submit()}>{busy ? "Submitting…" : "Submit report"}</Button></DialogContent></Dialog>;
}
