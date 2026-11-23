<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_documents', function (Blueprint $table): void {
            $table->string('issuer_type', 16)->nullable()->after('issuer_name_snapshot');
            $table->foreignId('issuer_partner_id')->nullable()->after('issuer_type')->constrained('partners')->nullOnDelete();
            $table->foreignId('issuer_driver_id')->nullable()->after('issuer_partner_id')->constrained('shipping_drivers')->nullOnDelete();
            $table->foreignId('shipping_driver_id')->nullable()->after('issuer_driver_id')->constrained('shipping_drivers')->nullOnDelete();
            $table->string('issuer_company_snapshot', 160)->nullable()->after('issuer_driver_id');
            $table->string('customer_name_snapshot', 200)->nullable()->after('issuer_company_snapshot');
            $table->string('customer_phone_snapshot', 32)->nullable()->after('customer_name_snapshot');
            $table->string('customer_governorate_snapshot', 120)->nullable()->after('customer_phone_snapshot');
            $table->string('governorate_snapshot', 120)->nullable()->after('customer_governorate_snapshot');
            $table->string('shipping_driver_name_snapshot', 160)->nullable()->after('driver_name_snapshot');
            $table->string('shipping_company_snapshot', 160)->nullable()->after('shipping_driver_name_snapshot');
            $table->string('return_reason', 500)->nullable()->after('shipping_company_snapshot');
            $table->string('discount_type', 16)->nullable()->after('discount_amount');
            $table->decimal('discount_value', 19, 4)->nullable()->after('discount_type');
            $table->timestamp('printed_at')->nullable()->after('posted_at');
            $table->unsignedInteger('print_count')->default(0)->after('printed_at');
        });

        Schema::table('sales_document_lines', function (Blueprint $table): void {
            $table->string('product_category_snapshot', 160)->nullable()->after('sku_snapshot');
            $table->decimal('company_price_egp_snapshot', 19, 4)->nullable()->after('unit_price');
            $table->decimal('manual_discount_amount', 19, 4)->nullable()->after('discount_amount');
        });
    }

    public function down(): void
    {
        Schema::table('sales_document_lines', function (Blueprint $table): void {
            $table->dropColumn(['product_category_snapshot', 'company_price_egp_snapshot', 'manual_discount_amount']);
        });

        Schema::table('sales_documents', function (Blueprint $table): void {
            $table->dropForeign(['issuer_partner_id']);
            $table->dropForeign(['issuer_driver_id']);
            $table->dropForeign(['shipping_driver_id']);
            $table->dropColumn([
                'issuer_type',
                'issuer_partner_id',
                'issuer_driver_id',
                'shipping_driver_id',
                'issuer_company_snapshot',
                'customer_name_snapshot',
                'customer_phone_snapshot',
                'customer_governorate_snapshot',
                'governorate_snapshot',
                'shipping_driver_name_snapshot',
                'shipping_company_snapshot',
                'return_reason',
                'discount_type',
                'discount_value',
                'printed_at',
                'print_count',
            ]);
        });
    }
};
