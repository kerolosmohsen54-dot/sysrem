# Forward schema change log

## 2026-10-11 — Container cost controls and status history

Migration `2026_10_11_000003_add_container_cost_controls_and_status_history` adds:

- `container_costs.include_in_inventory_cost`, a per-cost snapshot so cost inclusion is not retroactively changed by later configuration.
- `container_cost_type_settings`, the configurable default inclusion rule for each cost type.
- `container_status_history`, an append-only status transition record with actor, timestamp, and optional reason.

The migration is additive and does not edit the approved v4.1/v4.2 schema artifacts. It uses MySQL/MariaDB InnoDB, `BOOLEAN`/`TINYINT(1)`, `VARCHAR`, `DATETIME`, indexes, and foreign keys; these features are supported by MySQL 8.0+ and MariaDB 10.6+. Compatibility on the minimum supported versions remains NOT VERIFIED until tested on those versions.

The migration result and engine-specific verification are recorded in `docs/development/BACKEND_PROGRESS_LOG.md`.

## 2026-10-11 — Sales workflow cost and tax snapshots

Migration `2026_10_11_000005_add_sales_workflow_cost_and_tax_snapshots` adds:

- `sales_document_lines.unit_cost_egp_snapshot` to retain the invoice-time product cost used for profit reporting and linked returns.
- `sales_document_lines.tax_calculation_method_snapshot` to preserve the inclusive/exclusive tax method selected when the invoice is issued.
- `sales_document_lines.return_cost_method_snapshot` to identify the cost method used for each return line, including sold-line, current warehouse WAC, reconstructed historical warehouse WAC, or owner-entered cost.
- Named CHECK constraints restricting the two snapshot method values.

This forward-only migration relies on MySQL/MariaDB InnoDB `DECIMAL(19,4)`, `VARCHAR`, `ALTER TABLE ADD COLUMN`, and named CHECK constraints; feature floors are MySQL 8.0+ and MariaDB 10.6+. Minimum-version compatibility remains NOT VERIFIED; local migration tests run on MySQL 8.4.3 and MariaDB 13.0.2.

## 2026-10-11 — Explicit unapplied customer receipts

Migration `2026_10_11_000006_add_sales_receipt_unapplied_amount` adds `sales_receipts.unapplied_amount`, backfills it from receipt allocations and allocation reversals, makes it non-null with a zero default, and constrains it to the receipt amount. New allocations will decrement this stored amount; allocation reversals will restore it.

This forward-only migration uses `DECIMAL(19,4)`, `ALTER TABLE`, correlated aggregate subqueries, `COALESCE`, `SUM`, and named CHECK constraints. The relied-on feature floor is MySQL 8.0+ and MariaDB 10.6+; minimum-version compatibility remains NOT VERIFIED pending tests on those exact versions.

## 2026-10-11 — Container-line purchase value

Migration `2026_10_11_000004_add_container_line_purchase_value` adds nullable `container_lines.purchase_value_egp` so the entered line purchase value is retained independently from its rounded unit-cost snapshot. It is additive and uses `DECIMAL(19,4)`, supported on MySQL 8.0+ and MariaDB 10.6+. Minimum-version compatibility remains NOT VERIFIED.

## 2026-10-11 — Exactly one delivery source

Migration `2026_10_11_000007_enforce_delivery_source` adds `chk_deliveries_exactly_one_source`, requiring each delivery header to reference exactly one of a sales order or sales document. The v4.1 DDL already enforced this invariant on `delivery_lines` but not on the `deliveries` header; this additive migration closes that database-level gap without editing the approved v4.1 schema. The migration refuses to proceed if invalid delivery headers exist.

The migration uses MySQL/MariaDB InnoDB `ALTER TABLE ADD CONSTRAINT CHECK`; minimum feature floors are MySQL 8.0.16+ and MariaDB 10.6+. Only MySQL 8.4.3 and MariaDB 13.0.2 are locally available, so minimum-version behavior remains NOT VERIFIED.

## 2026-10-11 — Treasury, expense categories, and financial outbox

Migration `2026_10_11_000008_add_financial_outbox_and_expense_categories` adds owner-managed informational `expense_categories`, a nullable category link for preserving historical expenses, and optional `expenses.original_amount` / `expenses.exchange_rate` reference fields. Those reference-only values never participate in EGP posting or treasury balances. It also adds `financial_outbox_events`, a durable, uniquely keyed event queue written in the same transaction as posted financial documents; it does not create journal entries or journal rules.

The forward-only migration uses InnoDB tables, `DECIMAL`, `VARCHAR`, nullable foreign keys, indexes, and unique keys. It was applied to `erp_test` on MySQL 8.4.3 and MariaDB 13.0.2; targeted finance, authorization, sales, and inventory suites passed on both. Minimum-version compatibility remains NOT VERIFIED.

## 2026-10-30 — Container tracking, transfers, funds, and delivery permits

Migration `2026_10_30_000013_add_container_tracking_and_driver_links` adds container tracking stage, current location, shipping driver, trip reference, and a tracking event timeline. It also links container transfers to their source container, links container fund withdrawals to recorded expenses, and adds shipping driver, delivery date, source location, and transport method to delivery permits. Existing permits remain valid because the new delivery metadata is nullable for historical rows. Existing received container locations and basic stages are backfilled from their current status.

Container tracking stages deliberately remain separate from the operational container status. The reference defines those as separate concepts; the stage reflects the journey timeline while status reflects receiving workflow. A future status badge may be derived from the latest stage if the product owner wants them synchronized.
