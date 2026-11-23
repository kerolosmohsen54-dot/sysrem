# Proposed Role / Permission Matrix v4

**UNAPPROVED - development/design proposal only. NOT seeded data.**
OD-13 fixes mutation restrictions; OD-15 fixes financial visibility. This document does not resolve issuer logins or expand prototype roles.

| Action | Owner | Designated issuer 1 | Designated issuer 2 | Everyone else |
|---|---|---|---|---|
| Create invoice | Proposed allowed | Allowed | Allowed | Denied |
| Edit any document, including posted invoice | Allowed via OD-10 with reason/history | Denied | Denied | Denied |
| Reverse/correct any document | Allowed with reason/history | Denied | Denied | Denied |
| Other business/admin mutations | Proposed owner-only; exact action scope requires approval | Denied | Denied | Denied |
| Post/issue invoice separately from create | Owner proposal | OPEN; no grant inferred | OPEN; no grant inferred | Denied |
| Read cost/markup/profit in details/prints/exports/history/reports | Allowed | Denied | Denied | Denied |
| Other read/export scopes | OPEN | OPEN | OPEN | OPEN |

Suggested permission codes (proposal, not seeds): sales.create; sales.edit; sales.reverse; documents.correct; costs.read; markup.read; profit.read. Owner administrative mutation grants must be enumerated; no Accountant/Admin role inherits write rights from the prototype. Unspecified grants default deny.

The two supplied names appear as literal question marks and are NOT VERIFIED; labels above are identifiers in documentation only, not invented identities. Invoices retain both optional users FK and nonblank issuer name snapshot at issue. Whether the issuers have logins and how a no-login actor is safely authorized is OPEN. A submitted issuer name cannot authenticate a request.

Server middleware and services must enforce permissions, with payload filtering across lists/detail/print/export/report/history to protect cost/markup/profit. Every owner revision/reversal/correction requires actor/time/reason and field history, atomic with effects. Warning-only credit limits cannot be used to block authorized creation. No users, passwords, role assignments or permission rows are seeded.
