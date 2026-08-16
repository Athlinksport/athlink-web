import "server-only";
import { serverLog } from "./logger";

export async function captureServerError(error: unknown, context: { requestId: string; route: string }) {
  const message = error instanceof Error ? error.message : "Unknown server error";
  serverLog("error", "server_error", { ...context, errorName: error instanceof Error ? error.name : "Unknown", errorMessage: message });
  if (!process.env.MONITORING_DSN) return;
  // Provider-neutral boundary: connect the selected hosted SDK here after legal/security review.
  // Errors are deliberately not posted to an arbitrary URL without a vetted provider SDK.
}
