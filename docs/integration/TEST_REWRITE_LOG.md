# Test Rewrite Log

All placeholder tests using `assertSame(x, x)` are invalid and NOT VERIFIED. No real-request test has been deleted. Part B rewrite remains pending after the probe work.

Probe: authenticated `/api/v1/auth/me` passes with the shared trait after assigning a seeded role; unauthenticated request returns 401.

## Placeholder deletion (2026-10-13)
Deleted from SupplierTest.php: supplier_fixture_is_created_inside_test (no HTTP request), test_get_suppliers_without_permission_returns_403, test_get_purchase_invoices_without_permission_returns_403, test_post_purchase_invoice_without_csrf_is_rejected, test_post_purchase_invoice_without_step_up_is_rejected, test_missing_supplier_returns_supplier_id_validation_error, test_invalid_decimal_price_returns_validation_error, test_zero_quantity_returns_validation_error, test_unknown_purchase_invoice_returns_404 (all constant self-comparisons; no HTTP request).
Deleted from PurchaseInvoiceTest.php: decimal_string_total_is_exact, fixtures_are_created_inside_test, test_post_purchase_invoice_total_uses_decimal_strings, test_purchase_invoice_show_unknown_id_is_404, test_post_purchase_invoice_rejects_missing_supplier_field (all no real HTTP request / constant comparisons).
