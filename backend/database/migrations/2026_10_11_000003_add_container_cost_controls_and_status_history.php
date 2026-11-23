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
            throw new RuntimeException('Container cost controls require MySQL or MariaDB.');
        }

        Schema::table('container_costs', function (Blueprint $table): void {
            $table->boolean('include_in_inventory_cost')->default(false)->after('amount_egp');
        });

        Schema::create('container_cost_type_settings', function (Blueprint $table): void {
            $table->string('cost_type', 80)->primary();
            $table->boolean('include_in_inventory_cost')->default(false);
            $table->unsignedBigInteger('updated_by_user_id')->nullable();
            $table->timestamp('updated_at')->useCurrent();
            $table->foreign('updated_by_user_id', 'fk_container_cost_type_settings_user')
                ->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('container_status_history', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('container_id');
            $table->string('old_status', 32)->nullable();
            $table->string('new_status', 32);
            $table->unsignedBigInteger('changed_by_user_id')->nullable();
            $table->string('reason', 1000)->nullable();
            $table->dateTime('changed_at');
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('container_id', 'fk_container_status_history_container')
                ->references('id')->on('containers')->restrictOnDelete();
            $table->foreign('changed_by_user_id', 'fk_container_status_history_user')
                ->references('id')->on('users')->nullOnDelete();
            $table->index(['container_id', 'changed_at', 'id'], 'ix_container_status_history_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('container_status_history');
        Schema::dropIfExists('container_cost_type_settings');
        Schema::table('container_costs', function (Blueprint $table): void {
            $table->dropColumn('include_in_inventory_cost');
        });
    }
};
