# Schema v4 - Remaining Open Decisions

**UNAPPROVED - review only.** Resolved choices in OD-1..OD-20 are not reopened here. No SQL/database/runtime verification.

| Remaining detail | Exact question/boundary | Approver |
|---|---|---|
| Tax convention/formula | Fraction versus percent; inclusive/exclusive price; taxable base/exemptions and computation order. No default inferred. | Owner/accountant/tax specialist |
| Remaining rounding details | OD-18 fixes nearest-piastre invoice-line rounding; half-way tie rule, quantity/discount/tax calculation sequence, residual handling and all non-invoice rounding still unspecified. | Accountant/owner |
| Landed-cost eligibility/late costs | Eligible capitalized categories, allocation timing, manual residuals, late posted costs and reversals. Basis choice already resolved. | Accountant/logistics |
| Inventory valuation/reversals | Exact weighted-average update/reconciliation, return/free-return valuation, damaged disposition and edits after dependent movements. Negative on-hand prohibited. | Accountant/warehouse |
| Revisions/downstream records | Receipt/allocation reattachment, delivered stock effects and repeated-edit reconciliation; new revision tax-snapshot selection; retain all old values/effects. Editing itself is allowed. | Accountant/operations |
| Identifiers | Internal/external numeric versus UUID/ULID strategy. BIGINT remains unapproved candidate. | Technical/data owner |
| Authentication/CSRF | **Resolved in part by owner on 2026-10-10:** server-side sessions with same-site cookies and CSRF protection; 30-minute idle expiry, 12-hour absolute expiry, identifier rotation at login/permission change, revocation at logout/password reset, single-use reset link expiring in 30 minutes, and 90-day retention for revoked sessions. Login uses a unique username; phone/email remain optional and are not login identifiers. Password reset, if later implemented, uses verified email only and requires the administrator to have manually confirmed email ownership. Self-service reset remains deferred under v4.1. The owner authorized a **new schema-version proposal** adding an explicit email-verification marker; this authorizes drafting and validation only, not approval or migration. Do not edit v4.1 or implement reset behavior until the new proposal is reviewed and approved. Existing `auth_sessions` fields cover hashed session/CSRF secrets, expiry, last-seen and revocation; `password_reset_tokens` remains unused by API behavior. **Still open:** any cross-site deployment requirement and exact issuer permissions. | Security/technical owner |
| Issuer identity/permission detail | Two exact issuer names are unreadable question marks in the attachment, NOT VERIFIED; creation versus post authority and non-cost read/export scopes. Owner alone edits/reverses/corrects; no other mutation grants. | Owner/security |
| Journal design/periods | Accounts/templates/source effects, COGS and opening debit/credit mapping; close/reopen periods. | Accountant/controller |
| Numbering | Formats, period/scopes/reset/gap behavior and distinguishing invoice revision numbers; no chosen format. | Owner/technical |
| Full-order state/reservations | Exact state transitions, reserve/release lifecycle and stock-issue point; keep full quantities and no duplicate stock issue. Header field requirements still unspecified. | Sales/warehouse owner |
| Phone normalization/requiredness | Canonical phone format/country handling, missing numbers, duplicate migration handling. Non-null phone unique, name non-unique. | Customer-data owner |
| Credit warning basis | Balance basis/open/unapplied/aging treatment and warning evidence details. Warning cannot block. | Accountant/credit owner |
| Markup formula | Commercial formula/basis/history and price impact remain unspecified; owner-only visibility resolved. | Owner/commercial/accountant |
| Opening cut-over | Opening document dates/source mapping/costs/directions and reconciliation/sign-off. No supplier AP openings. | Owner/accountant/data owner |
| Returns/refunds/allocations | Credit versus cash refund, tax/COGS, disposition and allocation caps/reversals/reallocations. Linked or free return already selected. | Accountant/warehouse |
| Report formulas | Date/status/tax/discount/returns/COGS/period/permissions and reconciliation sources. Reports remain derived. | Accountant/report owners |
| Warehouse attributes | Manager/address/capacity/measurement/occupancy and which values are derived. | Warehouse/owner |
| Attachments | Scope, business ownership, storage/security/limits/scan/retention/deletion/audit; metadata alone insufficient. | Owner/security |
| Receipt-stage history | Current status versus append-only transitions, actor/time/reason. | Logistics/owner |
| Engine/runtime compatibility | Production likely MariaDB/Hostinger Premium; exact engine/PHP/extensions/collation/SQL mode/time zone still NOT VERIFIED. Inherited MySQL-oriented syntax needs separate v4.1 review, not this revision. | Technical/operations |

Record approver, date, selected rule, rationale and required DDL/service/report changes. Schema approval is explicit and separate from implementation, migration or deployment authorization. No option is selected by this register.
