<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mobile_payment_channels', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('treasury_account_id')->unique('uq_mobile_payment_channels_account')
                ->constrained('treasury_accounts')->restrictOnDelete();
            $table->string('name', 160);
            $table->enum('type', ['wallet', 'bank', 'instapay', 'postal', 'other']);
            $table->string('number', 160);
            $table->string('sender_filter', 200);
            $table->json('deposit_keywords')->nullable();
            $table->json('withdrawal_keywords')->nullable();
            $table->boolean('deposit_enabled')->default(true);
            $table->boolean('withdrawal_enabled')->default(true);
            $table->boolean('paused')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['sender_filter', 'type'], 'ix_mobile_payment_channels_sender_type');
            $table->index('paused', 'ix_mobile_payment_channels_paused');
        });

        Schema::create('mobile_captured_messages', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('channel_id')->constrained('mobile_payment_channels')->restrictOnDelete();
            $table->enum('direction', ['DEPOSIT', 'WITHDRAWAL', 'NEEDS_REVIEW']);
            $table->decimal('amount', 19, 4)->nullable();
            $table->longText('raw_text');
            $table->string('sender', 200);
            $table->dateTime('received_at');
            $table->char('text_hash', 64);
            $table->char('dedupe_key', 64)->unique('uq_mobile_captured_messages_dedupe');
            $table->enum('status', ['NEW', 'RECORDED', 'NEEDS_REVIEW', 'IGNORED'])->default('NEW');
            $table->enum('recorded_as', ['CUSTOMER_COLLECTION', 'EXPENSE'])->nullable();
            $table->unsignedBigInteger('recorded_ref_id')->nullable();
            $table->timestamps();
            $table->index(['channel_id', 'status'], 'ix_mobile_captured_channel_status');
            $table->index(['status', 'received_at'], 'ix_mobile_captured_status_received');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_captured_messages');
        Schema::dropIfExists('mobile_payment_channels');
    }
};
