<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use JsonException;

class AppSettingsSeeder extends Seeder
{
    /**
     * @throws JsonException
     */
    public function run(): void
    {
        $value = json_encode(
            ['enabled' => false, 'rate' => null, 'calculation_method' => null],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES,
        );

        DB::table('app_settings')->insertOrIgnore([
            'setting_key' => 'sales_tax',
            'setting_value' => $value,
            'description' => 'Tax starts disabled; configure an approved rate and inclusive/exclusive calculation method before invoice issue.',
            'updated_by_user_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
