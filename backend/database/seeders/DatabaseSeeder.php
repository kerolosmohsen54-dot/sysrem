<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionMatrixSeeder::class,
            AppSettingsSeeder::class,
            MobileCategorySeeder::class,
        ]);
    }
}
