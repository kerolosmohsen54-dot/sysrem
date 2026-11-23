<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_attachments', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
            $table->string('original_name', 255);
            $table->string('stored_path', 500)->unique();
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('size_bytes');
            $table->char('sha256', 64);
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['customer_id', 'created_at', 'id'], 'ix_customer_attachments_customer_created');
            $table->index(['customer_id', 'deleted_at'], 'ix_customer_attachments_customer_deleted');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_attachments');
    }
};
