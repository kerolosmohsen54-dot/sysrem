<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mobile_sources', function (Blueprint $table): void {
            $table->boolean('default_read_deposits')->default(false);
            $table->boolean('default_read_withdrawals')->default(false);
        });

        DB::table('mobile_sources')->update([
            'default_read_deposits' => DB::raw('read_deposits'),
            'default_read_withdrawals' => DB::raw('read_withdrawals'),
        ]);

        Schema::create('mobile_device_sources', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('device_id')->constrained('mobile_devices')->cascadeOnDelete();
            $table->foreignId('source_id')->constrained('mobile_sources')->cascadeOnDelete();
            $table->boolean('is_enabled')->default(false);
            $table->boolean('read_deposits')->default(false);
            $table->boolean('read_withdrawals')->default(false);
            $table->timestamps();
            $table->unique(['device_id', 'source_id'], 'uq_mobile_device_sources_device_source');
            $table->index(['source_id', 'device_id'], 'ix_mobile_device_sources_source_device');
        });

        DB::table('mobile_sources as source')
            ->join('mobile_devices as device', 'device.id', '=', 'source.device_id')
            ->orderBy('source.id')
            ->select(['source.id', 'source.device_id', 'source.read_deposits', 'source.read_withdrawals', 'source.created_at', 'source.updated_at', 'device.user_id'])
            ->chunk(500, function ($sources): void {
                foreach ($sources as $source) {
                    $now = now();
                    DB::table('mobile_device_sources')->insert([
                        'device_id' => $source->device_id,
                        'source_id' => $source->id,
                        'is_enabled' => true,
                        'read_deposits' => $source->read_deposits,
                        'read_withdrawals' => $source->read_withdrawals,
                        'created_at' => $source->created_at,
                        'updated_at' => $source->updated_at,
                    ]);
                    DB::table('mobile_sync_events')->insert([
                        'actor_user_id' => $source->user_id,
                        'device_id' => null,
                        'entity_type' => 'source',
                        'entity_id' => $source->id,
                        'event_type' => 'updated',
                        'created_at' => $now,
                    ]);
                }
            });

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE mobile_messages MODIFY COLUMN message_type ENUM('deposit', 'withdrawal', 'ambiguous') NOT NULL");
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            if (DB::table('mobile_messages')->where('message_type', 'ambiguous')->exists()) {
                throw new RuntimeException('Cannot roll back shared mobile sources while ambiguous messages exist.');
            }
            DB::statement("ALTER TABLE mobile_messages MODIFY COLUMN message_type ENUM('deposit', 'withdrawal') NOT NULL");
        }

        Schema::dropIfExists('mobile_device_sources');

        Schema::table('mobile_sources', function (Blueprint $table): void {
            $table->dropColumn(['default_read_deposits', 'default_read_withdrawals']);
        });
    }
};
