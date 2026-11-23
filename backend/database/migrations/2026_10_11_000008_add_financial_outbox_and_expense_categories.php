<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! in_array(DB::connection()->getConfig('driver'), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Financial outbox and expense categories require MySQL or MariaDB.');
        }

        Schema::create('expense_categories', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('name', 160)->unique('uq_expense_categories_name');
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index(['is_active', 'name'], 'ix_expense_categories_active_name');
        });

        Schema::table('expenses', function (Blueprint $table): void {
            $table->unsignedBigInteger('expense_category_id')->nullable()->after('expense_date');
            $table->decimal('original_amount', 19, 4)->nullable()->after('amount')
                ->comment('Reference only; never used in EGP posting or balance calculation.');
            $table->decimal('exchange_rate', 24, 10)->nullable()->after('original_amount')
                ->comment('Reference only; never used in EGP posting or balance calculation.');
            $table->foreign('expense_category_id', 'fk_expenses_category')
                ->references('id')->on('expense_categories')->restrictOnDelete();
            $table->index(['expense_category_id', 'expense_date', 'id'], 'ix_expenses_category_date');
        });

        Schema::create('financial_outbox_events', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('event_type', 100);
            $table->string('source_type', 100);
            $table->unsignedBigInteger('source_id');
            $table->longText('payload');
            $table->unsignedInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->dateTime('occurred_at');
            $table->dateTime('processed_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(
                ['source_type', 'source_id', 'event_type'],
                'uq_financial_outbox_source_event',
            );
            $table->index(['processed_at', 'occurred_at', 'id'], 'ix_financial_outbox_pending');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_outbox_events');
        Schema::table('expenses', function (Blueprint $table): void {
            $table->dropForeign('fk_expenses_category');
            $table->dropIndex('ix_expenses_category_date');
            $table->dropColumn(['expense_category_id', 'original_amount', 'exchange_rate']);
        });
        Schema::dropIfExists('expense_categories');
    }
};
