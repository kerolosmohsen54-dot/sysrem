<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('containers', function (Blueprint $table): void {
            $table->string('tracking_stage', 24)->default('purchase')->after('status');
            $table->foreignId('current_location_id')->nullable()->after('received_location_id')
                ->constrained('locations')->restrictOnDelete();
            $table->foreignId('shipping_driver_id')->nullable()->after('current_location_id')
                ->constrained('shipping_drivers')->restrictOnDelete();
            $table->string('trip_reference', 100)->nullable()->after('shipping_driver_id');
        });

        Schema::table('deliveries', function (Blueprint $table): void {
            $table->foreignId('shipping_driver_id')->nullable()->after('driver_user_id')
                ->constrained('shipping_drivers')->restrictOnDelete();
            $table->date('delivery_date')->nullable()->after('shipping_driver_id');
            $table->foreignId('source_location_id')->nullable()->after('delivery_date')
                ->constrained('locations')->restrictOnDelete();
            $table->string('transport_method', 64)->nullable()->after('source_location_id');
        });

        Schema::table('container_location_transfers', function (Blueprint $table): void {
            $table->foreignId('container_id')->nullable()->after('transfer_number')
                ->constrained('containers')->restrictOnDelete();
        });

        Schema::table('container_fund_movements', function (Blueprint $table): void {
            $table->foreignId('container_cost_id')->nullable()->after('container_id')
                ->constrained('container_costs')->restrictOnDelete();
        });

        DB::table('containers')->whereNull('current_location_id')->whereNotNull('received_location_id')
            ->update(['current_location_id' => DB::raw('received_location_id')]);
        DB::table('containers')->where('status', 'received')->update(['tracking_stage' => 'receipt']);
        DB::table('containers')->where('status', 'at_port')->update(['tracking_stage' => 'port_arrival']);
        DB::table('containers')->where('status', 'in_transit')->update(['tracking_stage' => 'shipping']);

        Schema::create('container_tracking_events', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('container_id');
            $table->string('event_type', 24);
            $table->dateTime('occurred_at');
            $table->string('reference_number', 120)->nullable();
            $table->string('details', 500)->nullable();
            $table->unsignedBigInteger('from_location_id')->nullable();
            $table->unsignedBigInteger('to_location_id')->nullable();
            $table->unsignedInteger('quantity')->nullable();
            $table->decimal('amount_egp', 19, 4)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('container_id', 'fk_container_tracking_events_container')
                ->references('id')->on('containers')->restrictOnDelete();
            $table->foreign('from_location_id', 'fk_container_tracking_events_from_location')
                ->references('id')->on('locations')->restrictOnDelete();
            $table->foreign('to_location_id', 'fk_container_tracking_events_to_location')
                ->references('id')->on('locations')->restrictOnDelete();
            $table->index(['container_id', 'occurred_at', 'id'], 'ix_container_tracking_events_date');
            $table->index(['container_id', 'event_type', 'source_id'], 'ix_container_tracking_events_source');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('container_tracking_events');
        Schema::table('container_fund_movements', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('container_cost_id');
        });
        Schema::table('container_location_transfers', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('container_id');
        });
        Schema::table('deliveries', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('source_location_id');
            $table->dropConstrainedForeignId('shipping_driver_id');
            $table->dropColumn(['delivery_date', 'transport_method']);
        });
        Schema::table('containers', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('shipping_driver_id');
            $table->dropConstrainedForeignId('current_location_id');
            $table->dropColumn(['tracking_stage', 'trip_reference']);
        });
    }
};
