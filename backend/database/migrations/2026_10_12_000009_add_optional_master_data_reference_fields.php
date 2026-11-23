<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->string('salesperson', 160)->nullable();
            $table->string('tax_number', 64)->nullable();
            $table->string('payment_terms', 160)->nullable();
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->decimal('default_tax_rate', 9, 6)->nullable();
            $table->decimal('last_purchase_price_reference', 19, 4)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn(['default_tax_rate', 'last_purchase_price_reference']);
        });

        Schema::table('customers', function (Blueprint $table): void {
            $table->dropColumn(['salesperson', 'tax_number', 'payment_terms']);
        });
    }
};
