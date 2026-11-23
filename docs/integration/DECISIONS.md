# Integration decisions

## 2026-10-14

- Mobile capture permissions (`mobile.channels.view`, `mobile.messages.capture`, `mobile.messages.record`) are persistent owner grants. The role-matrix seeder must recreate and grant them because it replaces the owner's matrix. Regression evidence: `backend/tests/Feature/MobileSchemaEngineTest.php`, MySQL and MariaDB; scratch reseed proof recorded in `FINISH_PROGRESS.md`.
- Mobile bearer-token calls do not use cookie CSRF validation. The capture-write step-up policy remains open: existing API behavior accepts capture with an expired confirmation timestamp. Device administration remains protected by session CSRF on writes and recent step-up.
- Existing accounting calculations and posting behavior remain unchanged in this session.
- Currency scope: honor the established EGP-only accounting contract. The currency screen manages reference metadata (ISO-style code, name, display symbol, decimal places, active state) only; it must not add exchange rates, change invoice/treasury amounts, or introduce foreign-currency posting. This resolves the request to make currency save/retrieve functional without overriding the approved EGP posting model. Revisit only with an explicit FX/accounting design.
