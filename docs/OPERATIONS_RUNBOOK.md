# Athlink operations runbook

## Authentication failure

Check provider status, `APP_URL`, Site URL/redirect allow-list, SMTP delivery, email template links, clock skew, and publishable key. Use request IDs; never request passwords or tokens from users.

## Database failure

Check Supabase health, connection saturation, slow queries, migration head, and structured server errors. Pause writes if integrity is uncertain. Do not disable RLS as a diagnostic.

## Storage failure

Check bucket existence, policy/grant state, MIME and size limits, quota, and object paths. Group cleanup endpoints can return partial-cleanup warnings; reconcile only scoped owner paths.

## Realtime failure

Confirm `messages` and `message_reads` publication membership, websocket reachability, client subscription cleanup, and fallback fetch behavior. Messaging writes remain authoritative even when Realtime is unavailable.

## Migration incident

Stop rollout, preserve the failing SQL/error and request IDs, compare migration histories, and prefer a forward fix. For destructive corruption, use the restoration procedure in `LAUNCH_CHECKLIST.md`.

## Compromised secret

Revoke/rotate the affected Supabase key or provider token immediately, update server environment configuration, redeploy, invalidate sessions if warranted, inspect audit/security logs, and document scope. Never place a service-role key in a `NEXT_PUBLIC_` variable.

## User-report escalation

Triage threats and immediate safety first, restrict context to the reported target, preserve the audit trail, suspend only when justified, and follow the reviewed legal escalation procedure. Do not promise emergency response through Athlink; direct immediate danger to local emergency services.

Structured logs must contain request IDs and event metadata only—never cookies, authorization headers, tokens, passwords, service keys, or private message content.
