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
            throw new RuntimeException('Container intake metadata requires MySQL or MariaDB.');
        }

        Schema::table('containers', function (Blueprint $table): void {
            $table->string('container_name', 160)->nullable()->after('container_number');
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->unsignedBigInteger('created_from_container_id')->nullable()->after('default_location_id');
            $table->index('created_from_container_id', 'ix_products_created_from_container');
            $table->foreign('created_from_container_id', 'fk_products_created_from_container')
                ->references('id')->on('containers')->nullOnDelete();
        });

        Schema::table('locations', function (Blueprint $table): void {
            $table->string('address', 500)->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->dropForeign('fk_products_created_from_container');
            $table->dropIndex('ix_products_created_from_container');
            $table->dropColumn('created_from_container_id');
        });

        Schema::table('locations', function (Blueprint $table): void {
            $table->dropColumn('address');
        });

        Schema::table('containers', function (Blueprint $table): void {
            $table->dropColumn('container_name');
        });
    }
};
