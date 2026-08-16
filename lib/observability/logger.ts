import "server-only";

type LogLevel = "info" | "warn" | "error";
const FORBIDDEN = /token|cookie|password|secret|authorization|message|content/i;

function sanitize(context: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(context).map(([key, value]) => [
    key,
    FORBIDDEN.test(key) ? "[REDACTED]" : typeof value === "string" && value.length > 500 ? `${value.slice(0, 500)}…` : value,
  ]));
}

export function serverLog(level: LogLevel, event: string, context: Record<string, unknown> = {}) {
  const record = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...sanitize(context) });
  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else console.info(record);
}

export function requestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}
