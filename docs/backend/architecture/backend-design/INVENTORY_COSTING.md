# Inventory Costing and Rounding

## Scope

Weighted-average cost is maintained independently for each `(product_id, location_id)` balance, matching the approved v4.1 schema. Quantities are whole items. All values are EGP.

## Posting rules

- Every receipt, issue, adjustment, and opening entry is an immutable posted inventory movement with one movement line. The service updates its balance projection in the same database transaction as the movement and audit rows.
- The movement ledger is authoritative. For a location, posted receipt-line extended costs increase inventory value and posted issue-line extended costs decrease it.
- Input unit prices are rounded half-up to the nearest piastre before posting. Receipt line value is the rounded unit price multiplied by the integer quantity.
- Average unit cost is the net inventory value divided by on-hand quantity, rounded half-up to the nearest piastre for storage and display.
- An issue allocates the exact current ledger value proportionally to the issued quantity, rounded half-up to the nearest piastre. The final issue to zero takes the entire remaining value. Therefore the extended issue cost can differ by a piastre from `quantity × displayed average`; that difference is the documented rounding residual, and the remaining balance continues to equal the net posted movement-line value.
- When quantity reaches zero, average cost is cleared and inventory value is zero. A later receipt starts a new weighted average for that product/location.
- Posting locks the product and location against deactivation and locks the composite balance row before checking stock. An issue may reach zero but cannot make on-hand stock negative.

The current implementation uses only PHP string/integer arithmetic and portable InnoDB transactions/row locks; it does not require BCMath, GMP, floating-point money arithmetic, triggers, or engine-specific SQL features.
