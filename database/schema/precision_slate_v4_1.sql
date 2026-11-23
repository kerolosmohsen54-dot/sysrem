-- Precision Slate ERP - portable MySQL/MariaDB schema v4.1; owner-approved 2026-10-10.
-- Canonical DDL source; validation and Laravel migration records are documented separately.
-- Base: v3; OD-1..OD-7 retained except invoice-line rounding resolved by OD-18.
-- OD-8..OD-20 applied as documented in the design/change log.
-- All operational amounts/calculations are EGP; optional foreign references
-- on container_costs are evidence only (OD-19), never calculation inputs.
-- Whole quantities, weighted-average costing, value/quantity/manual allocation.
-- Global tax enabled/rate snapshots at invoice issue; no default seeded.
-- Nearest piastre (2 decimals) per invoice line; tax convention still OPEN.
-- Owner can edit posted invoices via atomic reverse-and-record: retain both
-- sales_document versions, all effect reversals and every changed audit field.
-- Orders/deliveries: full fulfillment only; container partial receipts retained.
-- Suppliers: container-cost counterparties only; no purchasing/AP subledger.
-- Portable target: MySQL 8.0.16+ and MariaDB 10.6+; validate both engines.
-- CHECK enforcement requires MySQL 8.0.16+; no runtime-version-specific syntax.
-- Uses utf8mb4_unicode_ci; structured JSON payloads use LONGTEXT for portability.
-- Identifier strategy remains OPEN; BIGINT AUTO_INCREMENT is a candidate only.

CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(100) NULL,
    phone VARCHAR(32) NULL,
    email VARCHAR(254) NULL,
    display_name VARCHAR(160) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    password_changed_at DATETIME NULL,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_phone (phone),
    UNIQUE KEY uq_users_email (email),
    KEY ix_users_active_name (is_active, display_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_code (code),
    KEY ix_roles_active_name (is_active, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    granted_by_user_id BIGINT UNSIGNED NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    KEY ix_user_roles_role (role_id, user_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_roles_granted_by FOREIGN KEY (granted_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    KEY ix_role_permissions_permission (permission_id, role_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auth_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash BINARY(32) NOT NULL COMMENT 'Hash only; never persist the bearer/cookie secret itself',
    csrf_token_hash BINARY(32) NULL,
    expires_at DATETIME NOT NULL,
    last_seen_at DATETIME NULL,
    revoked_at DATETIME NULL,
    ip_address VARBINARY(16) NULL,
    user_agent VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
    KEY ix_auth_sessions_user_expiry (user_id, expires_at, revoked_at),
    CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_reset_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash BINARY(32) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_password_reset_token_hash (token_hash),
    KEY ix_password_reset_user_expiry (user_id, expires_at, used_at),
    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE customers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    customer_number VARCHAR(64) NULL,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(32) NULL,
    email VARCHAR(254) NULL,
    address VARCHAR(500) NULL,
    governorate VARCHAR(120) NULL,
    credit_limit DECIMAL(19,4) NULL,
    notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    status ENUM('active', 'paused', 'blocked') NOT NULL DEFAULT 'active',
    created_by_user_id BIGINT UNSIGNED NULL,
    updated_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_customers_number (customer_number),
    KEY ix_customers_name (name),
    UNIQUE KEY uq_customers_phone (phone),
    KEY ix_customers_active_name (is_active, name),
    KEY ix_customers_status_name (status, name),
    CONSTRAINT fk_customers_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_customers_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_customers_credit_limit CHECK (credit_limit IS NULL OR credit_limit >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE suppliers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    supplier_number VARCHAR(64) NULL,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(32) NULL,
    email VARCHAR(254) NULL,
    address VARCHAR(500) NULL,
    notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_suppliers_number (supplier_number),
    KEY ix_suppliers_name (name),
    KEY ix_suppliers_phone (phone),
    KEY ix_suppliers_active_name (is_active, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_category_id BIGINT UNSIGNED NULL,
    code VARCHAR(80) NULL,
    name VARCHAR(160) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_categories_code (code),
    KEY ix_product_categories_parent (parent_category_id),
    KEY ix_product_categories_name (name),
    CONSTRAINT fk_product_categories_parent FOREIGN KEY (parent_category_id) REFERENCES product_categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100) NULL,
    name VARCHAR(200) NOT NULL,
    category_id BIGINT UNSIGNED NULL,
    unit_code VARCHAR(32) NOT NULL COMMENT 'OD-2: whole individual items only; no fractional conversion',
    company_price DECIMAL(19,4) NULL,
    default_location_id BIGINT UNSIGNED NULL COMMENT 'Optional catalog convenience; does not define stock posting location',
    minimum_stock INT UNSIGNED NULL COMMENT 'Whole item threshold (OD-2)',
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id BIGINT UNSIGNED NULL,
    updated_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_sku (sku),
    UNIQUE KEY uq_products_barcode (barcode),
    KEY ix_products_name (name),
    KEY ix_products_category_active (category_id, is_active),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories (id) ON DELETE RESTRICT,
    CONSTRAINT fk_products_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_products_company_price CHECK (company_price IS NULL OR company_price >= 0),
    CONSTRAINT chk_products_minimum_stock CHECK (minimum_stock IS NULL OR minimum_stock >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE locations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_location_id BIGINT UNSIGNED NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(160) NOT NULL,
    location_type ENUM('main', 'sub', 'vehicle', 'damaged', 'other') NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_locations_code (code),
    KEY ix_locations_parent (parent_location_id),
    KEY ix_locations_type_active (location_type, is_active),
    CONSTRAINT fk_locations_parent FOREIGN KEY (parent_location_id) REFERENCES locations (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE document_sequences (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sequence_key VARCHAR(100) NOT NULL,
    period_key VARCHAR(16) NOT NULL DEFAULT '',
    next_number BIGINT UNSIGNED NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_document_sequences_key_period (sequence_key, period_key),
    CONSTRAINT chk_document_sequences_next CHECK (next_number >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_documents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    document_number VARCHAR(80) NOT NULL,
    document_type ENUM('invoice', 'credit_note', 'opening_receivable') NOT NULL,
    opening_balance_direction ENUM('debit', 'credit') NULL COMMENT 'OD-12: direction of a dated opening receivable document; not a customer balance column',
    status ENUM('draft', 'posted', 'reversed', 'cancelled') NOT NULL DEFAULT 'draft',
    customer_id BIGINT UNSIGNED NOT NULL,
    original_document_id BIGINT UNSIGNED NULL COMMENT 'OD-11: optional return origin; free returns permitted',
    previous_revision_id BIGINT UNSIGNED NULL COMMENT 'OD-10: retained predecessor; new row is the edited version',
    revision_number INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'OD-10: per-chain sequence; predecessor continuity is a service rule',
    issue_date DATE NOT NULL,
    due_date DATE NULL,
    issuer_user_id BIGINT UNSIGNED NULL,
    issuer_name_snapshot VARCHAR(160) NULL COMMENT 'OD-13: mandatory nonblank snapshot for issued invoices; issuer users FK remains optional',
    driver_user_id BIGINT UNSIGNED NULL,
    driver_name_snapshot VARCHAR(160) NULL COMMENT 'Supports non-user driver/issuer until D7 is resolved',
    payment_terms VARCHAR(120) NULL,
    notes TEXT NULL,
    subtotal DECIMAL(19,4) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
    total_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
    reversal_of_document_id BIGINT UNSIGNED NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    posted_by_user_id BIGINT UNSIGNED NULL,
    reversed_by_user_id BIGINT UNSIGNED NULL,
    posted_at DATETIME NULL,
    reversed_at DATETIME NULL,
    reversal_reason VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_documents_number (document_number),
    UNIQUE KEY uq_sales_documents_revision_successor (previous_revision_id),
    KEY ix_sales_documents_customer_date (customer_id, issue_date, id),
    KEY ix_sales_documents_status_date (status, issue_date, id),
    KEY ix_sales_documents_type_status (document_type, status, id),
    KEY ix_sales_documents_original (original_document_id),
    KEY ix_sales_documents_reversal (reversal_of_document_id),
    CONSTRAINT fk_sales_documents_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_documents_original FOREIGN KEY (original_document_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_documents_previous_revision FOREIGN KEY (previous_revision_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_documents_issuer FOREIGN KEY (issuer_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_documents_driver FOREIGN KEY (driver_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_documents_reversal FOREIGN KEY (reversal_of_document_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_documents_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_documents_posted_by FOREIGN KEY (posted_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_documents_reversed_by FOREIGN KEY (reversed_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_sales_documents_amounts CHECK (
        subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0
    ),
    CONSTRAINT chk_sales_documents_discount CHECK (discount_amount <= subtotal),
    CONSTRAINT chk_sales_documents_revision_shape CHECK (
        (previous_revision_id IS NULL AND revision_number = 1)
        OR (previous_revision_id IS NOT NULL AND revision_number > 1)
    ),
    CONSTRAINT chk_sales_documents_opening_direction CHECK (
        (document_type = 'opening_receivable' AND opening_balance_direction IS NOT NULL)
        OR (document_type <> 'opening_receivable' AND opening_balance_direction IS NULL)
    ),
    CONSTRAINT chk_sales_documents_issued_issuer CHECK (
        document_type <> 'invoice'
        OR (status = 'draft' AND posted_at IS NULL)
        OR (issuer_name_snapshot IS NOT NULL AND CHAR_LENGTH(TRIM(issuer_name_snapshot)) > 0)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_document_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sales_document_id BIGINT UNSIGNED NOT NULL,
    line_number INT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NULL,
    original_document_line_id BIGINT UNSIGNED NULL COMMENT 'OD-11: nullable for a free return; linked return bounds/product agreement enforced transactionally',
    return_condition ENUM('not_applicable', 'good', 'damaged') NOT NULL DEFAULT 'not_applicable',
    description_snapshot VARCHAR(500) NOT NULL,
    sku_snapshot VARCHAR(100) NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(19,4) NOT NULL,
    discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
    tax_enabled_snapshot BOOLEAN NULL COMMENT 'Set with tax_rate_snapshot when invoice is issued (OD-6)',
    tax_rate_snapshot DECIMAL(9,6) NULL COMMENT 'Issue-time settings snapshot; never recomputed from later settings (OD-6)',
    tax_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
    line_total DECIMAL(19,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_document_lines_number (sales_document_id, line_number),
    UNIQUE KEY uq_sales_document_lines_id_product (id, product_id),
    KEY ix_sales_document_lines_product (product_id, sales_document_id),
    KEY ix_sales_document_lines_location (location_id, product_id),
    KEY ix_sales_document_lines_original (original_document_line_id),
    CONSTRAINT fk_sales_document_lines_document FOREIGN KEY (sales_document_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_document_lines_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_document_lines_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_document_lines_original FOREIGN KEY (original_document_line_id) REFERENCES sales_document_lines (id) ON DELETE RESTRICT,
    CONSTRAINT chk_sales_document_lines_qty CHECK (quantity > 0),
    CONSTRAINT chk_sales_document_lines_amounts CHECK (
        unit_price >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND line_total >= 0
    ),
    CONSTRAINT chk_sales_document_lines_discount CHECK (discount_amount <= quantity * unit_price),
    CONSTRAINT chk_sales_document_lines_tax_snapshot CHECK (
        (tax_enabled_snapshot IS NULL AND tax_rate_snapshot IS NULL)
        OR (tax_enabled_snapshot = FALSE AND tax_rate_snapshot = 0)
        OR (tax_enabled_snapshot = TRUE AND tax_rate_snapshot >= 0)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE treasury_accounts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(160) NOT NULL,
    account_type ENUM('cash', 'bank', 'other') NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_treasury_accounts_code (code),
    KEY ix_treasury_accounts_active_name (is_active, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_receipts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    receipt_number VARCHAR(80) NOT NULL,
    receipt_type ENUM('collection', 'refund') NOT NULL DEFAULT 'collection',
    status ENUM('draft', 'posted', 'reversed', 'cancelled') NOT NULL DEFAULT 'draft',
    customer_id BIGINT UNSIGNED NOT NULL,
    treasury_account_id BIGINT UNSIGNED NOT NULL,
    receipt_date DATE NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    payment_method VARCHAR(40) NULL,
    external_reference VARCHAR(160) NULL,
    notes TEXT NULL,
    reversal_of_receipt_id BIGINT UNSIGNED NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    posted_by_user_id BIGINT UNSIGNED NULL,
    posted_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_receipts_number (receipt_number),
    KEY ix_sales_receipts_customer_date (customer_id, receipt_date, id),
    KEY ix_sales_receipts_treasury_date (treasury_account_id, receipt_date, id),
    KEY ix_sales_receipts_status_date (status, receipt_date, id),
    KEY ix_sales_receipts_reversal (reversal_of_receipt_id),
    CONSTRAINT fk_sales_receipts_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_receipts_treasury FOREIGN KEY (treasury_account_id) REFERENCES treasury_accounts (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_receipts_reversal FOREIGN KEY (reversal_of_receipt_id) REFERENCES sales_receipts (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_receipts_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_receipts_posted_by FOREIGN KEY (posted_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_sales_receipts_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_receipt_allocations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sales_receipt_id BIGINT UNSIGNED NOT NULL,
    sales_document_id BIGINT UNSIGNED NOT NULL,
    allocation_amount DECIMAL(19,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_receipt_document_allocation (sales_receipt_id, sales_document_id, id),
    KEY ix_receipt_allocations_document (sales_document_id, sales_receipt_id),
    CONSTRAINT fk_receipt_allocations_receipt FOREIGN KEY (sales_receipt_id) REFERENCES sales_receipts (id) ON DELETE RESTRICT,
    CONSTRAINT fk_receipt_allocations_document FOREIGN KEY (sales_document_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
    CONSTRAINT chk_receipt_allocations_amount CHECK (allocation_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chart_of_accounts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_account_id BIGINT UNSIGNED NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(160) NOT NULL,
    account_type ENUM('asset', 'liability', 'equity', 'revenue', 'expense') NOT NULL,
    normal_balance ENUM('debit', 'credit') NOT NULL,
    is_control_account BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_chart_of_accounts_code (code),
    KEY ix_chart_of_accounts_parent (parent_account_id),
    KEY ix_chart_of_accounts_type_active (account_type, is_active),
    CONSTRAINT fk_chart_of_accounts_parent FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE journal_entries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    entry_number VARCHAR(80) NOT NULL,
    status ENUM('draft', 'posted', 'reversed') NOT NULL DEFAULT 'draft',
    entry_date DATE NOT NULL,
    description VARCHAR(500) NOT NULL,
    source_type VARCHAR(80) NULL,
    source_id BIGINT UNSIGNED NULL COMMENT 'Polymorphic reference; application must validate the source relationship',
    reversal_of_entry_id BIGINT UNSIGNED NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    posted_by_user_id BIGINT UNSIGNED NULL,
    posted_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_journal_entries_number (entry_number),
    KEY ix_journal_entries_date_status (entry_date, status, id),
    UNIQUE KEY uq_journal_entries_source_once (source_type, source_id),
    KEY ix_journal_entries_reversal (reversal_of_entry_id),
    CONSTRAINT fk_journal_entries_reversal FOREIGN KEY (reversal_of_entry_id) REFERENCES journal_entries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_journal_entries_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_journal_entries_posted_by FOREIGN KEY (posted_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_journal_entries_source_pair CHECK ((source_type IS NULL) = (source_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE journal_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    journal_entry_id BIGINT UNSIGNED NOT NULL,
    line_number INT UNSIGNED NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    debit_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
    credit_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
    description VARCHAR(500) NULL,
    customer_id BIGINT UNSIGNED NULL,
    supplier_id BIGINT UNSIGNED NULL,
    treasury_account_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_journal_lines_number (journal_entry_id, line_number),
    KEY ix_journal_lines_account (account_id, journal_entry_id),
    KEY ix_journal_lines_customer (customer_id, journal_entry_id),
    KEY ix_journal_lines_supplier (supplier_id, journal_entry_id),
    CONSTRAINT fk_journal_lines_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_journal_lines_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts (id) ON DELETE RESTRICT,
    CONSTRAINT fk_journal_lines_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_journal_lines_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_journal_lines_treasury FOREIGN KEY (treasury_account_id) REFERENCES treasury_accounts (id) ON DELETE RESTRICT,
    CONSTRAINT chk_journal_lines_nonnegative CHECK (debit_amount >= 0 AND credit_amount >= 0),
    CONSTRAINT chk_journal_lines_one_side CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE treasury_entries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    treasury_account_id BIGINT UNSIGNED NOT NULL,
    entry_number VARCHAR(80) NOT NULL,
    entry_type ENUM('receipt', 'refund', 'expense', 'transfer_in', 'transfer_out', 'adjustment', 'opening', 'reversal') NOT NULL,
    direction ENUM('in', 'out') NOT NULL,
    entry_date DATE NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    source_type VARCHAR(80) NULL,
    source_id BIGINT UNSIGNED NULL COMMENT 'Polymorphic source; use typed foreign keys on source documents where available',
    reversal_of_entry_id BIGINT UNSIGNED NULL,
    description VARCHAR(500) NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    posted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_treasury_entries_number (entry_number),
    KEY ix_treasury_entries_account_date (treasury_account_id, entry_date, id),
    UNIQUE KEY uq_treasury_entries_source_once (source_type, source_id),
    KEY ix_treasury_entries_reversal (reversal_of_entry_id),
    CONSTRAINT fk_treasury_entries_account FOREIGN KEY (treasury_account_id) REFERENCES treasury_accounts (id) ON DELETE RESTRICT,
    CONSTRAINT fk_treasury_entries_reversal FOREIGN KEY (reversal_of_entry_id) REFERENCES treasury_entries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_treasury_entries_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_treasury_entries_amount CHECK (amount > 0),
    CONSTRAINT chk_treasury_entries_source_pair CHECK ((source_type IS NULL) = (source_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE expenses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    expense_number VARCHAR(80) NOT NULL,
    status ENUM('draft', 'posted', 'reversed', 'cancelled') NOT NULL DEFAULT 'draft',
    expense_date DATE NOT NULL,
    treasury_account_id BIGINT UNSIGNED NOT NULL,
    expense_account_id BIGINT UNSIGNED NULL COMMENT 'Required before journal posting; account mapping needs approval',
    amount DECIMAL(19,4) NOT NULL,
    description VARCHAR(500) NOT NULL,
    reference VARCHAR(160) NULL,
    treasury_entry_id BIGINT UNSIGNED NULL,
    journal_entry_id BIGINT UNSIGNED NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    posted_by_user_id BIGINT UNSIGNED NULL,
    posted_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_expenses_number (expense_number),
    UNIQUE KEY uq_expenses_treasury_entry (treasury_entry_id),
    UNIQUE KEY uq_expenses_journal_entry (journal_entry_id),
    KEY ix_expenses_date_status (expense_date, status, id),
    KEY ix_expenses_treasury_date (treasury_account_id, expense_date),
    CONSTRAINT fk_expenses_treasury FOREIGN KEY (treasury_account_id) REFERENCES treasury_accounts (id) ON DELETE RESTRICT,
    CONSTRAINT fk_expenses_account FOREIGN KEY (expense_account_id) REFERENCES chart_of_accounts (id) ON DELETE RESTRICT,
    CONSTRAINT fk_expenses_treasury_entry FOREIGN KEY (treasury_entry_id) REFERENCES treasury_entries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_expenses_journal_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_expenses_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_expenses_posted_by FOREIGN KEY (posted_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_expenses_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE treasury_transfers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    transfer_number VARCHAR(80) NOT NULL,
    status ENUM('draft', 'posted', 'reversed', 'cancelled') NOT NULL DEFAULT 'draft',
    transfer_date DATE NOT NULL,
    from_treasury_account_id BIGINT UNSIGNED NOT NULL,
    to_treasury_account_id BIGINT UNSIGNED NOT NULL,
    amount_egp DECIMAL(19,4) NOT NULL,
    journal_entry_id BIGINT UNSIGNED NULL,
    notes VARCHAR(1000) NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    posted_by_user_id BIGINT UNSIGNED NULL,
    posted_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_treasury_transfers_number (transfer_number),
    UNIQUE KEY uq_treasury_transfers_journal (journal_entry_id),
    KEY ix_treasury_transfers_date_status (transfer_date, status, id),
    CONSTRAINT fk_treasury_transfers_from_account FOREIGN KEY (from_treasury_account_id) REFERENCES treasury_accounts (id) ON DELETE RESTRICT,
    CONSTRAINT fk_treasury_transfers_to_account FOREIGN KEY (to_treasury_account_id) REFERENCES treasury_accounts (id) ON DELETE RESTRICT,
    CONSTRAINT fk_treasury_transfers_journal FOREIGN KEY (journal_entry_id) REFERENCES journal_entries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_treasury_transfers_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_treasury_transfers_posted_by FOREIGN KEY (posted_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_treasury_transfers_distinct_accounts CHECK (from_treasury_account_id <> to_treasury_account_id),
    CONSTRAINT chk_treasury_transfers_amount CHECK (amount_egp > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_movements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    movement_number VARCHAR(80) NOT NULL,
    movement_type ENUM('opening', 'receipt', 'sale', 'return', 'transfer', 'adjustment', 'damage', 'container_receipt', 'reversal') NOT NULL,
    status ENUM('draft', 'posted', 'reversed', 'cancelled') NOT NULL DEFAULT 'draft',
    movement_date DATE NOT NULL,
    source_type VARCHAR(80) NULL,
    source_id BIGINT UNSIGNED NULL COMMENT 'Polymorphic reference; a typed FK may be added after workflow review',
    reversal_of_movement_id BIGINT UNSIGNED NULL,
    reason VARCHAR(1000) NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    posted_by_user_id BIGINT UNSIGNED NULL,
    posted_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_movements_number (movement_number),
    KEY ix_inventory_movements_date_status (movement_date, status, id),
    KEY ix_inventory_movements_type_date (movement_type, movement_date, id),
    UNIQUE KEY uq_inventory_movements_source_once (source_type, source_id),
    KEY ix_inventory_movements_reversal (reversal_of_movement_id),
    CONSTRAINT fk_inventory_movements_reversal FOREIGN KEY (reversal_of_movement_id) REFERENCES inventory_movements (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movements_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_inventory_movements_posted_by FOREIGN KEY (posted_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_inventory_movements_source_pair CHECK ((source_type IS NULL) = (source_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_movement_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    inventory_movement_id BIGINT UNSIGNED NOT NULL,
    line_number INT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    from_location_id BIGINT UNSIGNED NULL,
    to_location_id BIGINT UNSIGNED NULL,
    sales_document_line_id BIGINT UNSIGNED NULL,
    container_receipt_line_id BIGINT UNSIGNED NULL COMMENT 'Original receipt effect; receipt line/product/movement are cross-checked by composite FK below',
    reversal_of_movement_line_id BIGINT UNSIGNED NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_cost_egp_snapshot DECIMAL(19,4) NULL COMMENT 'Weighted-average cost at movement posting (OD-3)',
    line_cost_egp_snapshot DECIMAL(19,4) NULL COMMENT 'Extended cost snapshot for stock value/COGS reconciliation (OD-3)',
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_movement_lines_number (inventory_movement_id, line_number),
    UNIQUE KEY uq_inventory_movement_lines_id_product (id, product_id),
    UNIQUE KEY uq_inventory_movement_lines_receipt_line (container_receipt_line_id),
    KEY ix_inventory_movement_lines_product_from (product_id, from_location_id, inventory_movement_id),
    KEY ix_inventory_movement_lines_product_to (product_id, to_location_id, inventory_movement_id),
    KEY ix_inventory_movement_lines_sales_line (sales_document_line_id),
    KEY ix_inventory_movement_lines_receipt_source (container_receipt_line_id, inventory_movement_id, product_id),
    KEY ix_inventory_movement_lines_reversal (reversal_of_movement_line_id),
    CONSTRAINT fk_inventory_movement_lines_movement FOREIGN KEY (inventory_movement_id) REFERENCES inventory_movements (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movement_lines_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movement_lines_from_location FOREIGN KEY (from_location_id) REFERENCES locations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movement_lines_to_location FOREIGN KEY (to_location_id) REFERENCES locations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movement_lines_sales_line FOREIGN KEY (sales_document_line_id) REFERENCES sales_document_lines (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movement_lines_reversal FOREIGN KEY (reversal_of_movement_line_id) REFERENCES inventory_movement_lines (id) ON DELETE RESTRICT,
    CONSTRAINT chk_inventory_movement_lines_qty CHECK (quantity > 0),
    CONSTRAINT chk_inventory_movement_lines_direction CHECK (from_location_id IS NOT NULL OR to_location_id IS NOT NULL),
    CONSTRAINT chk_inventory_movement_lines_distinct_locations CHECK (
        from_location_id IS NULL OR to_location_id IS NULL OR from_location_id <> to_location_id
    ),
    CONSTRAINT chk_inventory_movement_lines_cost CHECK (
        (unit_cost_egp_snapshot IS NULL OR unit_cost_egp_snapshot >= 0)
        AND (line_cost_egp_snapshot IS NULL OR line_cost_egp_snapshot >= 0)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_balances (
    product_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NOT NULL,
    quantity_on_hand INT NOT NULL DEFAULT 0 COMMENT 'Whole items (OD-2); negative stock prohibited (OD-17)',
    quantity_reserved INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Projection only; reservation behavior OPEN — D8',
    average_unit_cost_egp DECIMAL(19,4) NULL COMMENT 'Weighted-average cost per product/location (OD-3)',
    inventory_value_egp DECIMAL(19,4) NULL COMMENT 'Reconciled stock valuation projection (OD-3; rounding OPEN — OD-7)',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, location_id),
    KEY ix_inventory_balances_location_product (location_id, product_id),
    CONSTRAINT fk_inventory_balances_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_balances_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE RESTRICT,
    CONSTRAINT chk_inventory_balances_reserved CHECK (quantity_reserved >= 0),
    CONSTRAINT chk_inventory_balances_nonnegative CHECK (quantity_on_hand >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE containers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    container_number VARCHAR(100) NOT NULL,
    status ENUM('draft', 'in_transit', 'at_port', 'receiving', 'received', 'cancelled') NOT NULL DEFAULT 'draft',
    supplier_id BIGINT UNSIGNED NULL,
    origin VARCHAR(160) NULL,
    destination VARCHAR(160) NULL,
    landed_cost_allocation_basis ENUM('value', 'quantity', 'manual') NULL COMMENT 'Selected per container (OD-4); no default',
    estimated_departure DATE NULL,
    estimated_arrival DATE NULL,
    received_at DATETIME NULL,
    received_location_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    received_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_containers_number (container_number),
    KEY ix_containers_status_eta (status, estimated_arrival, id),
    KEY ix_containers_supplier (supplier_id, status),
    CONSTRAINT fk_containers_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_containers_received_location FOREIGN KEY (received_location_id) REFERENCES locations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_containers_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_containers_received_by FOREIGN KEY (received_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE container_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    container_id BIGINT UNSIGNED NOT NULL,
    line_number INT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    expected_quantity INT UNSIGNED NOT NULL,
    received_quantity INT UNSIGNED NULL COMMENT 'Aggregate/projection only; receipt-event lines are authoritative',
    purchase_unit_cost_egp DECIMAL(19,4) NULL COMMENT 'Stored in EGP only (OD-1)',
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_container_lines_number (container_id, line_number),
    UNIQUE KEY uq_container_lines_container_id_product (container_id, id, product_id),
    KEY ix_container_lines_product (product_id, container_id),
    CONSTRAINT fk_container_lines_container FOREIGN KEY (container_id) REFERENCES containers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_container_lines_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
    CONSTRAINT chk_container_lines_expected CHECK (expected_quantity > 0),
    CONSTRAINT chk_container_lines_received CHECK (received_quantity IS NULL OR received_quantity >= 0),
    CONSTRAINT chk_container_lines_unit_cost CHECK (purchase_unit_cost_egp IS NULL OR purchase_unit_cost_egp >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE container_costs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    container_id BIGINT UNSIGNED NOT NULL,
    supplier_id BIGINT UNSIGNED NULL,
    cost_type VARCHAR(80) NOT NULL COMMENT 'Freight, customs, handling, etc.; controlled vocabulary to be approved',
    description VARCHAR(500) NULL,
    amount_egp DECIMAL(19,4) NOT NULL COMMENT 'Foreign payment converted to EGP before persistence (OD-1)',
    original_amount_reference DECIMAL(19,4) NULL COMMENT 'OD-19: optional original foreign amount, evidence only; never used in calculations',
    exchange_rate_reference DECIMAL(19,8) NULL COMMENT 'OD-19: optional source exchange rate, evidence only; rate convention not inferred',
    original_currency_code_reference VARCHAR(16) NULL COMMENT 'OD-19: optional source currency text, evidence only; no currency master or FX computation',
    cost_date DATE NULL,
    status ENUM('estimated', 'incurred', 'paid', 'cancelled') NOT NULL DEFAULT 'estimated',
    created_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_container_costs_id_container (id, container_id),
    KEY ix_container_costs_container (container_id, status, cost_type),
    KEY ix_container_costs_supplier (supplier_id, cost_date),
    CONSTRAINT fk_container_costs_container FOREIGN KEY (container_id) REFERENCES containers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_container_costs_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_container_costs_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_container_costs_amount CHECK (amount_egp >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE container_cost_allocations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    container_cost_id BIGINT UNSIGNED NOT NULL,
    container_id BIGINT UNSIGNED NOT NULL,
    container_receipt_line_id BIGINT UNSIGNED NOT NULL,
    allocated_amount DECIMAL(19,4) NOT NULL,
    allocation_basis ENUM('value', 'quantity', 'manual') NOT NULL COMMENT 'Snapshot of containers.landed_cost_allocation_basis (OD-4)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_container_cost_allocation_receipt_line (container_cost_id, container_receipt_line_id),
    KEY ix_container_cost_allocations_cost_container (container_cost_id, container_id),
    KEY ix_container_cost_allocations_receipt_container (container_receipt_line_id, container_id),
    CONSTRAINT chk_container_cost_allocations_amount CHECK (allocated_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE container_receipts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    container_id BIGINT UNSIGNED NOT NULL,
    inventory_movement_id BIGINT UNSIGNED NOT NULL,
    status ENUM('posted', 'reversed') NOT NULL DEFAULT 'posted',
    received_at DATETIME NOT NULL,
    received_by_user_id BIGINT UNSIGNED NULL,
    journal_entry_id BIGINT UNSIGNED NULL,
    costing_method_snapshot ENUM('weighted_average') NOT NULL DEFAULT 'weighted_average' COMMENT 'OD-3: approved costing method snapshot',
    allocation_basis_snapshot ENUM('value', 'quantity', 'manual') NULL COMMENT 'OD-4 basis selected for this container receipt',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_container_receipts_movement (inventory_movement_id),
    UNIQUE KEY uq_container_receipts_journal (journal_entry_id),
    UNIQUE KEY uq_container_receipts_id_movement_container (id, inventory_movement_id, container_id),
    CONSTRAINT fk_container_receipts_container FOREIGN KEY (container_id) REFERENCES containers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_container_receipts_movement FOREIGN KEY (inventory_movement_id) REFERENCES inventory_movements (id) ON DELETE RESTRICT,
    CONSTRAINT fk_container_receipts_received_by FOREIGN KEY (received_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_container_receipts_journal FOREIGN KEY (journal_entry_id) REFERENCES journal_entries (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE container_receipt_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    container_receipt_id BIGINT UNSIGNED NOT NULL,
    inventory_movement_id BIGINT UNSIGNED NOT NULL,
    container_id BIGINT UNSIGNED NOT NULL,
    container_line_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    expected_quantity INT UNSIGNED NOT NULL,
    received_quantity INT UNSIGNED NOT NULL,
    discrepancy_quantity BIGINT NOT NULL COMMENT 'Signed difference: received_quantity - expected_quantity',
    discrepancy_reason VARCHAR(1000) NULL,
    condition_code VARCHAR(40) NULL COMMENT 'Uncontrolled label pending owner-approved condition vocabulary',
    received_at DATETIME NOT NULL,
    received_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_container_receipt_lines_receipt_container_line (container_receipt_id, container_line_id),
    UNIQUE KEY uq_container_receipt_lines_id_movement_product (id, inventory_movement_id, product_id),
    UNIQUE KEY uq_container_receipt_lines_id_container (id, container_id),
    KEY ix_container_receipt_lines_container_line (container_id, container_line_id),
    KEY ix_container_receipt_lines_container_line_product (container_id, container_line_id, product_id),
    KEY ix_container_receipt_lines_receipt_source (container_receipt_id, inventory_movement_id, container_id),
    KEY ix_container_receipt_lines_product (product_id, container_receipt_id),
    CONSTRAINT fk_container_receipt_lines_receipt FOREIGN KEY (container_receipt_id, inventory_movement_id, container_id) REFERENCES container_receipts (id, inventory_movement_id, container_id) ON DELETE RESTRICT,
    CONSTRAINT fk_container_receipt_lines_container_line_product FOREIGN KEY (container_id, container_line_id, product_id) REFERENCES container_lines (container_id, id, product_id) ON DELETE RESTRICT,
    CONSTRAINT fk_container_receipt_lines_received_by FOREIGN KEY (received_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_container_receipt_lines_expected CHECK (expected_quantity > 0),
    CONSTRAINT chk_container_receipt_lines_received CHECK (received_quantity >= 0),
    CONSTRAINT chk_container_receipt_lines_discrepancy CHECK (
        discrepancy_quantity = CAST(received_quantity AS SIGNED) - CAST(expected_quantity AS SIGNED)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_number VARCHAR(80) NOT NULL,
    status ENUM('draft', 'confirmed', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'draft',
    customer_id BIGINT UNSIGNED NOT NULL,
    order_date DATE NOT NULL,
    requested_delivery_date DATE NULL,
    notes TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    confirmed_by_user_id BIGINT UNSIGNED NULL,
    confirmed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_orders_number (order_number),
    KEY ix_sales_orders_customer_date (customer_id, order_date, id),
    KEY ix_sales_orders_status_date (status, order_date, id),
    CONSTRAINT fk_sales_orders_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_orders_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_orders_confirmed_by FOREIGN KEY (confirmed_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_order_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sales_order_id BIGINT UNSIGNED NOT NULL,
    line_number INT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(19,4) NOT NULL,
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_order_lines_number (sales_order_id, line_number),
    UNIQUE KEY uq_sales_order_lines_id_product (id, product_id),
    KEY ix_sales_order_lines_product (product_id, sales_order_id),
    CONSTRAINT fk_sales_order_lines_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_order_lines_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
    CONSTRAINT chk_sales_order_lines_qty CHECK (quantity > 0),
    CONSTRAINT chk_sales_order_lines_price CHECK (unit_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_order_invoice_allocations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sales_order_line_id BIGINT UNSIGNED NOT NULL,
    sales_document_line_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_order_invoice_allocation_pair (sales_order_line_id, sales_document_line_id),
    KEY ix_sales_order_invoice_allocation_order_product (sales_order_line_id, product_id),
    KEY ix_sales_order_invoice_allocation_invoice_product (sales_document_line_id, product_id),
    KEY ix_sales_order_invoice_allocation_invoice_line (sales_document_line_id, sales_order_line_id),
    CONSTRAINT fk_sales_order_invoice_allocation_order_line_product FOREIGN KEY (sales_order_line_id, product_id) REFERENCES sales_order_lines (id, product_id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_order_invoice_allocation_invoice_line_product FOREIGN KEY (sales_document_line_id, product_id) REFERENCES sales_document_lines (id, product_id) ON DELETE RESTRICT,
    CONSTRAINT chk_sales_order_invoice_allocation_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE deliveries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    delivery_number VARCHAR(80) NOT NULL,
    sales_order_id BIGINT UNSIGNED NULL,
    sales_document_id BIGINT UNSIGNED NULL,
    status ENUM('draft', 'preparing', 'in_transit', 'delivered', 'cancelled') NOT NULL DEFAULT 'draft',
    driver_user_id BIGINT UNSIGNED NULL,
    driver_name_snapshot VARCHAR(160) NULL COMMENT 'D7: driver may not be an application user',
    vehicle_plate VARCHAR(40) NULL,
    delivery_address VARCHAR(500) NULL,
    delivered_at DATETIME NULL,
    notes TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_deliveries_number (delivery_number),
    KEY ix_deliveries_status_created (status, created_at, id),
    KEY ix_deliveries_order (sales_order_id),
    KEY ix_deliveries_sales_document (sales_document_id),
    CONSTRAINT fk_deliveries_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id) ON DELETE RESTRICT,
    CONSTRAINT fk_deliveries_sales_document FOREIGN KEY (sales_document_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
    CONSTRAINT fk_deliveries_driver FOREIGN KEY (driver_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_deliveries_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    delivery_id BIGINT UNSIGNED NOT NULL,
    sales_order_line_id BIGINT UNSIGNED NULL,
    sales_document_line_id BIGINT UNSIGNED NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    inventory_movement_line_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_delivery_lines_delivery (delivery_id, id),
    KEY ix_delivery_lines_order_line (sales_order_line_id),
    KEY ix_delivery_lines_document_line (sales_document_line_id),
    KEY ix_delivery_lines_order_product (sales_order_line_id, product_id),
    KEY ix_delivery_lines_document_product (sales_document_line_id, product_id),
    KEY ix_delivery_lines_movement_product (inventory_movement_line_id, product_id),
    UNIQUE KEY uq_delivery_lines_inventory_movement_line (inventory_movement_line_id),
    CONSTRAINT fk_delivery_lines_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_lines_order_line_product FOREIGN KEY (sales_order_line_id, product_id) REFERENCES sales_order_lines (id, product_id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_lines_document_line_product FOREIGN KEY (sales_document_line_id, product_id) REFERENCES sales_document_lines (id, product_id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_lines_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_lines_inventory_movement_line FOREIGN KEY (inventory_movement_line_id, product_id) REFERENCES inventory_movement_lines (id, product_id) ON DELETE RESTRICT,
    CONSTRAINT chk_delivery_lines_quantity CHECK (quantity > 0),
    CONSTRAINT chk_delivery_lines_exactly_one_source CHECK ((sales_order_line_id IS NULL) <> (sales_document_line_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE app_settings (
    setting_key VARCHAR(120) NOT NULL,
    setting_value LONGTEXT NOT NULL COMMENT 'JSON-encoded text; validate in application code',
    description VARCHAR(500) NULL,
    updated_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_key),
    CONSTRAINT fk_app_settings_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The sales_tax setting is JSON { "enabled": boolean, "rate": number }.
-- No default is seeded; configure it before invoice issue.

CREATE TABLE idempotency_records (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    idempotency_key VARCHAR(200) NOT NULL,
    request_hash BINARY(32) NOT NULL,
    http_status SMALLINT UNSIGNED NULL,
    response_body LONGTEXT NULL COMMENT 'JSON-encoded text; validate in application code',
    resource_type VARCHAR(80) NULL,
    resource_id BIGINT UNSIGNED NULL,
    state ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
    expires_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_idempotency_user_key (user_id, idempotency_key),
    KEY ix_idempotency_expiry (expires_at, state),
    KEY ix_idempotency_resource (resource_type, resource_id),
    CONSTRAINT fk_idempotency_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_user_id BIGINT UNSIGNED NULL,
    actor_name_snapshot VARCHAR(160) NULL COMMENT 'OD-10: required on field changes; preserves who if the optional users FK becomes null',
    sales_document_id BIGINT UNSIGNED NULL COMMENT 'OD-10: edited/new invoice version; predecessor identified by previous_revision_id',
    field_path VARCHAR(500) NULL COMMENT 'OD-10: stable header/line field path; one row for every changed field',
    old_value LONGTEXT NULL COMMENT 'OD-10: JSON-encoded text; validate in application; SQL NULL reserved for other audit actions',
    new_value LONGTEXT NULL COMMENT 'OD-10: JSON-encoded text; validate in application; SQL NULL reserved for other audit actions',
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    reason VARCHAR(1000) NULL,
    before_data LONGTEXT NULL COMMENT 'JSON-encoded text; validate in application code',
    after_data LONGTEXT NULL COMMENT 'JSON-encoded text; validate in application code',
    request_id VARCHAR(100) NULL,
    ip_address VARBINARY(16) NULL,
    user_agent VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_audit_logs_entity (entity_type, entity_id, created_at),
    KEY ix_audit_logs_actor_date (actor_user_id, created_at),
    KEY ix_audit_logs_action_date (action, created_at),
    KEY ix_audit_logs_request_id (request_id),
    KEY ix_audit_logs_sales_document (sales_document_id, created_at, id),
    CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_logs_sales_document FOREIGN KEY (sales_document_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
    CONSTRAINT chk_audit_logs_field_change CHECK (
        action <> 'sales_document.field_change'
        OR (
            sales_document_id IS NOT NULL
            AND field_path IS NOT NULL AND CHAR_LENGTH(TRIM(field_path)) > 0
            AND old_value IS NOT NULL AND new_value IS NOT NULL
            AND actor_name_snapshot IS NOT NULL AND CHAR_LENGTH(TRIM(actor_name_snapshot)) > 0
            AND reason IS NOT NULL AND CHAR_LENGTH(TRIM(reason)) > 0
        )
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_document_postings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sales_document_id BIGINT UNSIGNED NOT NULL,
    inventory_movement_id BIGINT UNSIGNED NULL,
    journal_entry_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_document_postings_document (sales_document_id),
    UNIQUE KEY uq_sales_document_postings_movement (inventory_movement_id),
    UNIQUE KEY uq_sales_document_postings_journal (journal_entry_id),
    CONSTRAINT fk_sales_document_postings_document FOREIGN KEY (sales_document_id) REFERENCES sales_documents (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_document_postings_movement FOREIGN KEY (inventory_movement_id) REFERENCES inventory_movements (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_document_postings_journal FOREIGN KEY (journal_entry_id) REFERENCES journal_entries (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_receipt_postings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sales_receipt_id BIGINT UNSIGNED NOT NULL,
    treasury_entry_id BIGINT UNSIGNED NULL,
    journal_entry_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_receipt_postings_receipt (sales_receipt_id),
    UNIQUE KEY uq_sales_receipt_postings_treasury (treasury_entry_id),
    UNIQUE KEY uq_sales_receipt_postings_journal (journal_entry_id),
    CONSTRAINT fk_sales_receipt_postings_receipt FOREIGN KEY (sales_receipt_id) REFERENCES sales_receipts (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_receipt_postings_treasury FOREIGN KEY (treasury_entry_id) REFERENCES treasury_entries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_receipt_postings_journal FOREIGN KEY (journal_entry_id) REFERENCES journal_entries (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_receipt_allocation_reversals (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sales_receipt_allocation_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    actor_user_id BIGINT UNSIGNED NULL,
    reversed_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_sales_receipt_allocation_reversals_allocation (sales_receipt_allocation_id, reversed_at, id),
    CONSTRAINT fk_sales_receipt_allocation_reversals_allocation FOREIGN KEY (sales_receipt_allocation_id) REFERENCES sales_receipt_allocations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_receipt_allocation_reversals_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_sales_receipt_allocation_reversals_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE treasury_transfer_entries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    treasury_transfer_id BIGINT UNSIGNED NOT NULL,
    treasury_entry_id BIGINT UNSIGNED NOT NULL,
    transfer_leg ENUM('outflow', 'inflow') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_treasury_transfer_entries_transfer_leg (treasury_transfer_id, transfer_leg),
    UNIQUE KEY uq_treasury_transfer_entries_entry (treasury_entry_id),
    CONSTRAINT fk_treasury_transfer_entries_transfer FOREIGN KEY (treasury_transfer_id) REFERENCES treasury_transfers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_treasury_transfer_entries_entry FOREIGN KEY (treasury_entry_id) REFERENCES treasury_entries (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE container_cost_payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    container_cost_id BIGINT UNSIGNED NOT NULL,
    treasury_entry_id BIGINT UNSIGNED NOT NULL,
    journal_entry_id BIGINT UNSIGNED NULL,
    amount_egp DECIMAL(19,4) NOT NULL COMMENT 'Converted to EGP before persistence (OD-1)',
    paid_at DATETIME NOT NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_container_cost_payments_treasury_entry (treasury_entry_id),
    UNIQUE KEY uq_container_cost_payments_journal_entry (journal_entry_id),
    KEY ix_container_cost_payments_cost (container_cost_id, paid_at, id),
    CONSTRAINT fk_container_cost_payments_cost FOREIGN KEY (container_cost_id) REFERENCES container_costs (id) ON DELETE RESTRICT,
    CONSTRAINT fk_container_cost_payments_treasury FOREIGN KEY (treasury_entry_id) REFERENCES treasury_entries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_container_cost_payments_journal FOREIGN KEY (journal_entry_id) REFERENCES journal_entries (id) ON DELETE RESTRICT,
    CONSTRAINT fk_container_cost_payments_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_container_cost_payments_amount CHECK (amount_egp > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attachment_metadata (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    storage_key VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    media_type VARCHAR(160) NULL,
    byte_size BIGINT UNSIGNED NOT NULL,
    sha256 BINARY(32) NULL,
    uploaded_by_user_id BIGINT UNSIGNED NULL,
    uploaded_at DATETIME NOT NULL,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attachment_metadata_storage_key (storage_key),
    KEY ix_attachment_metadata_uploader_date (uploaded_by_user_id, uploaded_at),
    KEY ix_attachment_metadata_deleted_at (deleted_at),
    CONSTRAINT fk_attachment_metadata_uploaded_by FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Optional metadata only; module pending G-06. No file bytes or owner relation are modeled.';

ALTER TABLE inventory_movement_lines
    ADD CONSTRAINT fk_inventory_movement_lines_container_receipt_line
        FOREIGN KEY (container_receipt_line_id, inventory_movement_id, product_id)
        REFERENCES container_receipt_lines (id, inventory_movement_id, product_id)
        ON DELETE RESTRICT;

ALTER TABLE container_cost_allocations
    ADD CONSTRAINT fk_container_cost_allocations_cost_container
        FOREIGN KEY (container_cost_id, container_id)
        REFERENCES container_costs (id, container_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_container_cost_allocations_receipt_line_container
        FOREIGN KEY (container_receipt_line_id, container_id)
        REFERENCES container_receipt_lines (id, container_id)
        ON DELETE RESTRICT;

ALTER TABLE products
    ADD CONSTRAINT fk_products_default_location
        FOREIGN KEY (default_location_id) REFERENCES locations (id)
        ON DELETE RESTRICT;

-- Transaction and application invariants (not expressible as row CHECKs):
--   1. Lock inventory_balances rows in stable (product_id, location_id) order;
--      validate available stock and update the projection together with posting
--      inventory_movements/lines, source document status, journal entries,
--      treasury entries, idempotency result, and audit row as one transaction.
--   2. Rebuild/reconcile inventory_balances from POSTED movement lines; the
--      movement ledger, not the projection, is the authoritative history.
--   3. Lock receipt + document rows before enforcing total allocation <= receipt
--      amount and allocation <= remaining posted-document balance.
--   4. Enforce balanced journal totals at posting time; a row CHECK cannot
--      enforce SUM(debit_amount) = SUM(credit_amount) across journal_lines.
--   5. Use document_sequences rows with SELECT ... FOR UPDATE to allocate
--      unique numbers; format/prefix/year rules remain undecided.
--   6. OD-10: owner edits posted invoices by retaining old/new versions,
--      reversing old effects and recording new effects atomically. Retain audit
--      field changes (including tiny changes/additions/removals) with reason.
--   7. For authenticated idempotency, atomically claim (user_id, key), compare request_hash,
--      and persist/replay the exact response; a mismatch is a conflict.
--   8. All monetary values are EGP. Convert foreign container costs before
--      persistence; optional original amount/rate/currency text are reference only.
--   9. Enforce that receipt allocations refer to compatible document/customer
--      and receipt/document types; foreign keys alone cannot express this.
--  10. A container may have multiple receipt events. Within each event, reconcile
--      receipt-line quantities to linked movement lines and enforce exactly-once
--      posting with source keys/idempotency inside one receive transaction.
--  11. Reconcile the transfer's required outflow/inflow transfer-leg rows and
--      their directions/accounts/amounts in the posting service.
--  12. Calculate unapplied receipt balance as receipt amount minus net active
--      allocations (allocation amounts less append-only reversal amounts).

-- v4 service invariants, not DDL promises:
--  13. OD-8: invoice and deliver every ordered quantity in full, no partial
--      fulfillment. Keep bridges for exact line/product lineage and old/new
--      invoice versions; prevent duplicate stock issue. State/reservations OPEN.
--  14. OD-9: suppliers only container-cost counterparties; no AP workflows.
--  15. OD-10: lock predecessor/current version plus balances; require owner and
--      nonblank reason; ensure same business invoice, sequential revision number,
--      no cycles/forks and no stale revision. Old effects must be reversed once;
--      new version has new posting/source identity. Audit one row per field
--      (sales_document.field_change) with old/new JSON-encoded text values and actor snapshot.
--      SQL constraints cannot prove history completeness or accounting equality.
--  16. OD-11: linked returns enforce product/customer/quantity compatibility
--      under row locks. Free returns have null origin; valuation/refunds OPEN.
--  17. OD-12: opening_receivable documents use issue_date and direction;
--      inventory_movements opening rows use movement_date/product/location/cost;
--      treasury_entries opening rows use entry_date/direction. Retain source
--      reason and audit; distinguish from normal activity; no fixed master balances.
--  18. OD-13/15: owner alone edits/reverses/corrects, designated two issuers
--      create invoices, all others cannot modify; cost/markup/profit owner only.
--      Issuer login/post permissions OPEN; user FK optional, issued name required.
--  19. OD-14: credit-limit breach warns only, never blocks; use audit_logs action
--      sales_document.credit_warning for optional evidence (threshold/balance).
--  20. OD-16: unique non-null customer phone; normalization/requiredness OPEN.
--  21. OD-17: no negative on-hand. Lock/check/post/update atomically; CHECK is
--      only a complementary proposal and engine enforcement NOT VERIFIED.
--  22. OD-18: nearest piastre per invoice line using exact math; ties/sequence,
--      non-invoice rounding and tax convention OPEN. DECIMAL scale is capacity.
--  23. OD-19: never compute EGP amount or valuation from foreign reference fields.
--  24. OD-20: multiple/partial receipts allowed with per-event exactly-once effects.
