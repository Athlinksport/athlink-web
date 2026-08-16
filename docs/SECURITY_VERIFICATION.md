# Database security verification

Run against a disposable local Supabase stack:

```sh
supabase start
supabase db reset
npm run test:db-security
```

The pgTAP suite verifies RLS and anonymous function denial. Before launch, extend the disposable three-user fixture to assert private-group visibility, membership writes, message participant isolation, self-message rejection, read-marker ownership, arbitrary-user helper denial, bilateral blocking, report ownership/duplicate rejection, administrator-only rows, and anonymous table denial.

Remote integration tests are intentionally absent from pull-request CI: they would require privileged secrets. Run them in a protected scheduled environment or locally against the disposable stack.
