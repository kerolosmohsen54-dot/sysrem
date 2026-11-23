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
            throw new RuntimeException('The mobile companion schema requires MySQL or MariaDB.');
        }

        Schema::create('mobile_devices', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('name', 160);
            $table->string('model', 160)->nullable();
            $table->char('token_hash', 64)->nullable();
            $table->dateTime('token_expires_at')->nullable();
            $table->dateTime('last_seen_at')->nullable();
            $table->dateTime('revoked_at')->nullable();
            $table->timestamps();
            $table->unique('token_hash', 'uq_mobile_devices_token_hash');
            $table->index(['user_id', 'revoked_at', 'id'], 'ix_mobile_devices_user_revoked');
        });

        Schema::create('mobile_channels', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('treasury_account_id')->unique('uq_mobile_channels_treasury')
                ->constrained('treasury_accounts')->restrictOnDelete();
            $table->enum('channel_type', ['bank', 'instapay', 'wallet', 'post_office', 'other']);
            $table->string('identifier', 160)->nullable();
            $table->enum('status', ['active', 'paused', 'archived'])->default('active');
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['status', 'id'], 'ix_mobile_channels_status');
            $table->index(['channel_type', 'status', 'id'], 'ix_mobile_channels_type_status');
        });

        Schema::create('mobile_sources', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('device_id')->constrained('mobile_devices')->restrictOnDelete();
            $table->foreignId('channel_id')->constrained('mobile_channels')->restrictOnDelete();
            $table->enum('source_kind', ['sms', 'notification']);
            $table->string('sender_identifier', 200)->nullable();
            $table->json('notification_package_names')->nullable();
            $table->boolean('read_deposits')->default(false);
            $table->boolean('read_withdrawals')->default(false);
            $table->json('deposit_keywords')->nullable();
            $table->json('withdrawal_keywords')->nullable();
            $table->unsignedSmallInteger('parser_rule_version')->nullable();
            $table->json('parser_rule')->nullable();
            $table->text('redacted_sample_message')->nullable();
            $table->enum('status', ['active', 'paused', 'archived'])->default('active');
            $table->softDeletes();
            $table->timestamps();
            $table->index(['device_id', 'status', 'id'], 'ix_mobile_sources_device_status');
            $table->index(['channel_id', 'status', 'id'], 'ix_mobile_sources_channel_status');
            $table->index(['source_kind', 'sender_identifier', 'status'], 'ix_mobile_sources_sender');
        });

        Schema::create('mobile_categories', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('name', 160)->unique('uq_mobile_categories_name');
            $table->enum('category_kind', ['expense', 'transfer']);
            $table->foreignId('expense_category_id')->nullable()
                ->constrained('expense_categories')->restrictOnDelete();
            $table->foreignId('target_treasury_account_id')->nullable()
                ->constrained('treasury_accounts')->restrictOnDelete();
            $table->boolean('requires_notes')->default(false);
            $table->boolean('is_system')->default(false);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['category_kind', 'is_active', 'id'], 'ix_mobile_categories_kind_active');
        });

        Schema::create('mobile_messages', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('device_id')->constrained('mobile_devices')->restrictOnDelete();
            $table->foreignId('source_id')->constrained('mobile_sources')->restrictOnDelete();
            $table->foreignId('channel_id')->constrained('mobile_channels')->restrictOnDelete();
            $table->enum('message_type', ['deposit', 'withdrawal']);
            $table->decimal('amount', 19, 4)->nullable();
            $table->string('sender_identifier', 200);
            $table->dateTime('received_at');
            $table->dateTime('server_received_at');
            $table->longText('raw_text');
            $table->char('text_hash', 64);
            $table->char('duplicate_hash', 64)->unique('uq_mobile_messages_duplicate_hash');
            $table->enum('status', ['new', 'registered', 'ignored', 'needs_review', 'archived'])->default('new');
            $table->string('registered_source', 24)->nullable();
            $table->string('registered_document_type', 80)->nullable();
            $table->unsignedBigInteger('registered_document_id')->nullable();
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('reviewed_at')->nullable();
            $table->dateTime('archived_at')->nullable();
            $table->timestamps();
            $table->index(['device_id', 'status', 'received_at', 'id'], 'ix_mobile_messages_device_status_date');
            $table->index(['channel_id', 'message_type', 'status', 'received_at', 'id'], 'ix_mobile_messages_channel_type_date');
            $table->index(['source_id', 'received_at', 'id'], 'ix_mobile_messages_source_date');
            $table->index(['status', 'received_at', 'id'], 'ix_mobile_messages_status_date');
            $table->index(['registered_document_type', 'registered_document_id'], 'ix_mobile_messages_document');
        });

        Schema::create('mobile_sync_events', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('device_id')->nullable()->constrained('mobile_devices')->nullOnDelete();
            $table->string('entity_type', 80);
            $table->unsignedBigInteger('entity_id');
            $table->enum('event_type', ['created', 'updated', 'archived', 'deleted']);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['entity_type', 'entity_id', 'id'], 'ix_mobile_sync_entity');
            $table->index(['created_at', 'id'], 'ix_mobile_sync_cursor');
        });

        Schema::create('mobile_idempotency_records', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('device_id')->constrained('mobile_devices')->restrictOnDelete();
            $table->string('idempotency_key', 200);
            $table->char('request_hash', 64);
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->longText('response_body')->nullable();
            $table->string('resource_type', 80)->nullable();
            $table->unsignedBigInteger('resource_id')->nullable();
            $table->enum('state', ['started', 'completed']);
            $table->timestamp('created_at')->useCurrent();
            $table->dateTime('completed_at')->nullable();
            $table->unique(['device_id', 'idempotency_key'], 'uq_mobile_idempotency_device_key');
            $table->index(['state', 'created_at', 'id'], 'ix_mobile_idempotency_state');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_idempotency_records');
        Schema::dropIfExists('mobile_sync_events');
        Schema::dropIfExists('mobile_messages');
        Schema::dropIfExists('mobile_categories');
        Schema::dropIfExists('mobile_sources');
        Schema::dropIfExists('mobile_channels');
        Schema::dropIfExists('mobile_devices');
    }
};
