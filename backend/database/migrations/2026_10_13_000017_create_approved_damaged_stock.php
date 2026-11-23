<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up(): void { Schema::create('approved_damaged_stock',function(Blueprint $t){$t->id();$t->foreignId('product_id')->constrained();$t->foreignId('warehouse_id')->constrained('locations');$t->unsignedInteger('quantity');$t->decimal('cost_egp',19,4);$t->string('status',32)->default('approved');$t->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();$t->timestamp('approved_at')->nullable();$t->string('idempotency_key',200)->unique();$t->timestamps();}); } public function down(): void {Schema::dropIfExists('approved_damaged_stock');} };