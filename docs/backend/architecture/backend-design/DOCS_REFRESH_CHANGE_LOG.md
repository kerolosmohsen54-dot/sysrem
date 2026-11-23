# Documentation Refresh Change Log

Date: 2026-10-09. Scope: canonical backend design documentation only.
Baseline: v3 OD-1..OD-7 and supplied Round 2 OD-8..OD-20; no v4 schema artifacts found.
Updated: 12 existing canonical docs. Added: OWNER_DECISIONS_ALIGNMENT.md and this log.
No application code, schema, HTML, duplicate snapshot, migrations or seeds edited. No SQL/database connection or runtime validation. No commits performed.

## Complete edit list
Each numbered item identifies the edited document and change. Whole-document refreshes replace obsolete sections with the resolved decision register, remaining gaps or candidate mapping; the descriptions below and current document content specify the refreshed sections.

1. **BACKEND_ARCHITECTURE.md** — Separate schema governance from invoice revision policy.
2. **BACKEND_ARCHITECTURE.md** — Replace stale missing-files claim.
3. **BACKEND_ARCHITECTURE.md** — Distinguish proposals from approved schema.
4. **BACKEND_ARCHITECTURE.md** — Reconcile historical UI with selected policies.
5. **BACKEND_ARCHITECTURE.md** — Apply OD-18 rounding.
6. **BACKEND_ARCHITECTURE.md** — Remove currency/FX scope.
7. **BACKEND_ARCHITECTURE.md** — Resolve costing/basis and preserve partial receipts.
8. **BACKEND_ARCHITECTURE.md** — Include full-only fulfillment.
9. **BACKEND_ARCHITECTURE.md** — Restrict suppliers.
10. **BACKEND_ARCHITECTURE.md** — Remove obsolete conditional modules and immutable invoice policy.
11. **BACKEND_ARCHITECTURE.md** — Record snapshot divergence.
12. **BACKEND_DECISIONS_AND_GAPS.md** — Replace stale unresolved decisions and immutable assumption; retain only unresolved details.
13. **BUSINESS_LOGIC_AND_TRANSACTIONS.md** — Refresh workflow table, posted revisions/history and all money/stock/fulfillment invariants.
14. **API_CONTRACTS.md** — Use revision concurrency rather than container-wide receive prohibition.
15. **API_CONTRACTS.md** — Remove credit-block error.
16. **API_CONTRACTS.md** — Propose optional user FK and issuer name snapshot.
17. **API_CONTRACTS.md** — Use whole-unit quantity example.
18. **API_CONTRACTS.md** — Align posting, costing, tax, rounding and credit warning.
19. **API_CONTRACTS.md** — Replace weight basis and one-time receive with partial receipt events.
20. **API_CONTRACTS.md** — Refresh payload coordination gaps.
21. **API_CONTRACTS.md** — Add proposed revision/history, full fulfillment, free returns, customer/opening/reference contracts.
22. **API_ENDPOINT_CATALOG.md** — Resolve customer uniqueness gate.
23. **API_ENDPOINT_CATALOG.md** — Resolve invoice posting gates.
24. **API_ENDPOINT_CATALOG.md** — Resolve reversal gate.
25. **API_ENDPOINT_CATALOG.md** — Remove finance currencies endpoint.
26. **API_ENDPOINT_CATALOG.md** — Replace once-only container receipt endpoint.
27. **API_ENDPOINT_CATALOG.md** — Resolve allocation choice and foreign reference scope.
28. **API_ENDPOINT_CATALOG.md** — Replace obsolete conditional scope.
29. **API_ENDPOINT_CATALOG.md** — Include full orders, counterparty suppliers, revisions/history and free returns.
30. **API_ENDPOINT_CATALOG.md** — Replace immutable implication with revision policy and restricted grants.
31. **AUTHENTICATION_AND_AUTHORIZATION.md** — Replace prototype role matrix with OD-13/15 permissions and partial issuer-login decision.
32. **BACKEND_FOLDER_STRUCTURE.md** — Refresh module scope.
33. **BACKEND_FOLDER_STRUCTURE.md** — Make orders/deliveries included.
34. **BACKEND_FOLDER_STRUCTURE.md** — Restrict suppliers.
35. **BACKEND_FOLDER_STRUCTURE.md** — Refresh Money responsibility.
36. **BACKEND_FOLDER_STRUCTURE.md** — Add revision/history responsibilities and EGP-only finance boundary.
37. **BACKEND_IMPLEMENTATION_PLAN.md** — Start Phase 0 with docs refresh.
38. **BACKEND_IMPLEMENTATION_PLAN.md** — Refresh customer gate.
39. **BACKEND_IMPLEMENTATION_PLAN.md** — Include editable posted invoices.
40. **BACKEND_IMPLEMENTATION_PLAN.md** — Refresh sales dependencies.
41. **BACKEND_IMPLEMENTATION_PLAN.md** — Preserve partial container receiving.
42. **BACKEND_IMPLEMENTATION_PLAN.md** — Include full fulfillment phase.
43. **BACKEND_IMPLEMENTATION_PLAN.md** — Clarify docs-only Phase 0, approval boundaries, EGP/supplier/opening scope.
44. **DATABASE_SCHEMA_MAPPING.md** — Replace obsolete no-schema-files checklist with explicit v3 candidate mappings and v4 targets/unverified boundaries.
45. **BACKEND_TEST_STRATEGY.md** — Update rounding test policy.
46. **BACKEND_TEST_STRATEGY.md** — Scope duplicate detection to events/revisions.
47. **BACKEND_TEST_STRATEGY.md** — Add acceptance coverage for every changed owner workflow and explicit future-only boundary.
48. **HOSTINGER_VPS_DEPLOYMENT.md** — Avoid treating VPS topology as confirmed current hosting.
49. **HOSTINGER_VPS_DEPLOYMENT.md** — Preserve conditional deployment proposal; defer engine compatibility.
50. **SECURITY_REQUIREMENTS.md** — Apply owner permission and visibility restrictions.
51. **SECURITY_REQUIREMENTS.md** — Separate editable invoices from retained audit history.
52. **SECURITY_REQUIREMENTS.md** — Add nonnegative stock and revision concurrency controls.
53. **OWNER_DECISIONS_ALIGNMENT.md** — Create authoritative OD-1..OD-20 baseline, precedence, unresolved details and snapshot boundary.
54. **API_CONTRACTS.md** — Add shared owner-decision baseline link and design-only verification status.
55. **API_ENDPOINT_CATALOG.md** — Add shared owner-decision baseline link and design-only verification status.
56. **AUTHENTICATION_AND_AUTHORIZATION.md** — Add shared owner-decision baseline link and design-only verification status.
57. **BACKEND_ARCHITECTURE.md** — Add shared owner-decision baseline link and design-only verification status.
58. **BACKEND_DECISIONS_AND_GAPS.md** — Add shared owner-decision baseline link and design-only verification status.
59. **BACKEND_FOLDER_STRUCTURE.md** — Add shared owner-decision baseline link and design-only verification status.
60. **BACKEND_IMPLEMENTATION_PLAN.md** — Add shared owner-decision baseline link and design-only verification status.
61. **BACKEND_TEST_STRATEGY.md** — Add shared owner-decision baseline link and design-only verification status.
62. **BUSINESS_LOGIC_AND_TRANSACTIONS.md** — Add shared owner-decision baseline link and design-only verification status.
63. **DATABASE_SCHEMA_MAPPING.md** — Add shared owner-decision baseline link and design-only verification status.
64. **HOSTINGER_VPS_DEPLOYMENT.md** — Add shared owner-decision baseline link and design-only verification status.
65. **SECURITY_REQUIREMENTS.md** — Add shared owner-decision baseline link and design-only verification status.
66. **API_ENDPOINT_CATALOG.md** — Remove broad unresolved D1 gate.
67. **API_ENDPOINT_CATALOG.md** — Resolve visibility while keeping pricing formula open.
68. **API_ENDPOINT_CATALOG.md** — Remove obsolete unresolved costing/visibility report gates.
69. **BACKEND_TEST_STRATEGY.md** — Clarify distinct concurrency and replay expectations.

70. **DOCS_REFRESH_CHANGE_LOG.md** — Create this complete edit list and scope/verification/snapshot record.

71. **Existing canonical documents** — Preserve original UTF-8 symbols and directory-tree characters; remove the accidental transport encoding changes found during diff review. Write UTF-8 without BOM.

## Verification
Prepared contents reviewed for old currency endpoints, immutable-invoice policy, weight basis, container-wide one-time receipt and conditional orders/supplier AP. Only negative or historical references to these removed rules remain. Candidate mappings, physical v4 history/opening fields, tax detail and engine compatibility explicitly remain NOT VERIFIED/OPEN.

After writing, compare every file against prepared content, review git diff/status and recheck SHA-256 of earlier proposals, reference HTML and duplicate snapshot. Verification outcome is reported in the task response; this paragraph describes the check without claiming a database test.

## Snapshot divergence
duplicate-backend-design-snapshot remains unchanged. All 12 corresponding canonical documents now differ from their historical copies; the new alignment/log docs have no snapshot counterparts. Canonical documentation is the updated owner-decision baseline.
