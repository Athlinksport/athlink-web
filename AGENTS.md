# Athlink Development Guidelines

## Project stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Supabase for authentication, database, storage, RLS, RPC and realtime
- shadcn/ui for reusable interface components
- Lucide React for interface icons
- Framer Motion for purposeful animations

## UI and visual identity

- Use a dark navy interface with lime accents.
- Keep the UI modern, clean, accessible and mobile-first.
- Prefer subtle glass effects, soft borders and rounded surfaces.
- Avoid excessive visual effects, oversized panels and clutter.
- Preserve consistent spacing, typography and component sizing.
- Use Lucide icons for controls instead of raw emoji characters.
- Emoji characters are allowed inside user-generated messages and emoji pickers.

## Component architecture

- Prefer reusable components over long page files.
- Break complex pages into focused components.
- Use shadcn/ui components when they fit the requirement.
- Avoid duplicating UI patterns.
- Keep components typed and avoid `any` unless temporarily required.
- Preserve existing aliases such as `@/`.

## Supabase safety

- Preserve existing Supabase authentication, RLS, realtime and RPC logic.
- Do not modify database policies, functions, migrations or schema unless explicitly requested.
- Do not expose service-role keys in client code.
- Ensure users can access only data permitted by existing policies.
- Keep realtime subscriptions scoped and clean them up on unmount.

## Chat requirements

- Only connected users may start direct conversations.
- Preserve the existing `get_or_create_direct_conversation` RPC workflow.
- Messages from the current user appear on the right.
- Messages from the other user appear on the left.
- Keep the composer accessible and responsive.
- Maintain realtime delivery without duplicate messages.
- Prefer compact, user-friendly media and emoji controls.

## Editing rules

- Inspect existing code before changing it.
- Preserve working behavior unless the task explicitly requires a change.
- Make the smallest coherent change needed.
- Do not rewrite unrelated files.
- Explain important architectural changes briefly.
- Remove temporary debugging code before finishing.

## Validation

After meaningful changes:

1. Run the relevant TypeScript and lint checks.
2. Run `npm run build` when practical.
3. Report any unresolved errors honestly.
4. Do not claim success if validation fails.