# Athlink launch checklist

## Required configuration

- Set every value documented in `.env.example`; keep `SUPABASE_SERVICE_ROLE_KEY`, `MONITORING_DSN`, and `RATE_LIMIT_TOKEN` server-only.
- Set Supabase Auth **Site URL** to `https://YOUR_PRODUCTION_DOMAIN`.
- Add exact Auth redirect URLs:
  - `https://YOUR_PRODUCTION_DOMAIN/auth/callback`
  - `https://YOUR_PRODUCTION_DOMAIN/auth/callback?next=/dashboard`
  - `https://YOUR_PRODUCTION_DOMAIN/auth/callback?next=/reset-password`
  - local equivalents under `http://localhost:3000` for development.
- Configure a verified custom SMTP sender. Review confirmation, password recovery, email-change, and invite templates; links must use `{{ .ConfirmationURL }}` and the production domain.
- Configure the production domain, HTTPS redirect, DNS, and canonical `APP_URL`.
- Set storage MIME/size limits for avatars, covers, and post images; verify private `group-post-images` behavior.
- Confirm `messages` and `message_reads` are in the Realtime publication after migration.
- Enable database backups/PITR appropriate to the launch tier and configure security/auth alerts.
- Select and vet a hosted monitoring provider before setting `MONITORING_DSN`.
- Select a durable edge rate-limit provider for login/recovery traffic and set `RATE_LIMIT_URL`/`RATE_LIMIT_TOKEN`. Database throttles already protect authenticated write actions.
- Supply `LEGAL_OWNER_NAME`, `SUPPORT_CONTACT`, and `PRIVACY_CONTACT`; replace bracketed draft fields and obtain qualified legal review.
- Supply a designed 1200×630 Open Graph image and maskable/PWA application icons. Only the existing Athlink favicon is currently used.

## Migration and release order

1. Freeze schema changes and review every pending SQL file.
2. Take and verify a restorable production backup.
3. Compare local and remote history with `supabase migration list`.
4. Run `npx supabase db push --dry-run`, review SQL, then apply migrations once in timestamp order.
5. Manually bootstrap the first reviewed administrator UUID in `public.admin_roles`.
6. Deploy the application configuration and build.
7. Run the three-user smoke test below, then enable public traffic.

Never edit an applied migration. Add a new forward migration.

## Three-user smoke test

- User A and B confirm emails, complete profiles, connect, open one Room, exchange messages, verify right/left alignment and unread clearing.
- User C cannot message A before connection. A blocks C; verify C disappears from A eligibility, neither side can connect/start/send, and unblock restores eligibility.
- B reports A user, a group, post, comment, and A’s direct message. Confirm duplicate open-report rejection.
- A normal user receives 403 from `/api/admin/reports`; the bootstrapped admin sees the reports, filters/paginates, records notes, resolves/dismisses, suspends/restores the reported user, and removes test group content.
- Delete the disposable User C account and verify sign-out, auth deletion, owned object cleanup or explicit warnings, and retained anonymized moderation history.

## Rollback

- Prefer a forward corrective migration and application rollback to the previous immutable build.
- If a launch migration is destructive or corrupting, stop writes, preserve logs, take a second forensic backup, and restore the pre-launch backup into a new project/database before switching traffic.
- Never run down migrations blindly in production. Validate auth, RLS, storage, Realtime, and row counts in staging first.

## Backup and restoration

- Before migrations, record backup timestamp, project, migration head, row-count checks, storage inventory, and operator.
- Test restoration to an isolated project. Restore database first, then storage objects/configuration, Auth redirect/SMTP settings, secrets, and Realtime publication.
- Run RLS/security tests and the three-user smoke test before DNS/traffic cutover.
