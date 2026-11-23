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
            throw new RuntimeException('Mobile password confirmation requires MySQL or MariaDB.');
        }

        Schema::table('mobile_devices', function (Blueprint $table): void {
            $table->dateTime('password_confirmed_at')->nullable()->after('last_seen_at');
            $table->dateTime('issued_password_changed_at')->nullable()->after('password_confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('mobile_devices', function (Blueprint $table): void {
            $table->dropColumn(['password_confirmed_at', 'issued_password_changed_at']);
        });
    }
};
