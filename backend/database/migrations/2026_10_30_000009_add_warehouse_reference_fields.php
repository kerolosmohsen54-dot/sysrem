<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('locations', function (Blueprint $table): void {
            $table->string('manager_name', 160)->nullable();
            $table->unsignedInteger('capacity_units')->nullable();
            $table->index(['location_type', 'is_active', 'name']);
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Warehouse reference fields are retained to preserve stored data.');
    }
};
