<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('governorates', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120)->unique();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['is_active', 'sort_order', 'name']);
        });

        $now = now();
        $names = ['القاهرة','الجيزة','الإسكندرية','القليوبية','الشرقية','الدقهلية','البحيرة','الغربية','المنوفية','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','مطروح','شمال سيناء','جنوب سيناء','الوادي الجديد'];
        foreach ($names as $index => $name) {
            DB::table('governorates')->insert(['name' => $name, 'sort_order' => $index + 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
        }

        Schema::create('shipping_drivers', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 160)->unique();
            $table->string('shipping_company', 160)->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['is_active', 'name']);
        });

        Schema::create('trash_items', function (Blueprint $table): void {
            $table->id();
            $table->string('entity_type', 80);
            $table->unsignedBigInteger('entity_id');
            $table->string('label', 200);
            $table->json('snapshot');
            $table->foreignId('deleted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('deleted_at')->useCurrent();
            $table->foreignId('restored_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('restored_at')->nullable();
            $table->index(['restored_at', 'deleted_at', 'id']);
            $table->index(['entity_type', 'entity_id', 'restored_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trash_items');
        Schema::dropIfExists('shipping_drivers');
        Schema::dropIfExists('governorates');
    }
};
