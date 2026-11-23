<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MobileCategorySeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $drawer = DB::table('treasury_accounts')->where('code', 'MOBILE-CASH-DRAWER')->first();
            if ($drawer === null) {
                $matches = DB::table('treasury_accounts')->where('name', 'الدرج')->get();
                if ($matches->count() > 1) {
                    throw new RuntimeException('More than one treasury account is named الدرج; resolve the cash drawer account before seeding mobile categories.');
                }
                if ($matches->count() === 1) {
                    $drawer = $matches->first();
                    if (! (bool) $drawer->is_active || $drawer->account_type !== 'cash') {
                        throw new RuntimeException('The existing الدرج treasury account must be active and have cash account type.');
                    }
                } else {
                    $now = now();
                    $id = (int) DB::table('treasury_accounts')->insertGetId([
                        'code' => 'MOBILE-CASH-DRAWER',
                        'name' => 'الدرج',
                        'account_type' => 'cash',
                        'notes' => 'System treasury account for mobile drawer transfers.',
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $drawer = DB::table('treasury_accounts')->where('id', $id)->first();
                }
            } elseif ($drawer->name !== 'الدرج' || ! (bool) $drawer->is_active || $drawer->account_type !== 'cash') {
                throw new RuntimeException('The MOBILE-CASH-DRAWER treasury account must be named الدرج, active, and have cash account type.');
            }

            $drawerCategory = DB::table('mobile_categories')->where('name', 'الدرج')->first();
            if ($drawerCategory === null) {
                $now = now();
                DB::table('mobile_categories')->insert([
                    'name' => 'الدرج',
                    'category_kind' => 'transfer',
                    'target_treasury_account_id' => $drawer->id,
                    'requires_notes' => false,
                    'is_system' => true,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            } elseif ($drawerCategory->category_kind !== 'transfer'
                || (int) $drawerCategory->target_treasury_account_id !== (int) $drawer->id) {
                throw new RuntimeException('The existing الدرج mobile category must transfer to the configured cash drawer account.');
            }

            foreach (['الرواتب', 'مصاريف المخزن', 'مصاريف أخرى'] as $name) {
                $expenseCategory = DB::table('expense_categories')->where('name', $name)->first();
                if ($expenseCategory === null) {
                    $now = now();
                    $expenseId = (int) DB::table('expense_categories')->insertGetId([
                        'name' => $name,
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                } else {
                    $expenseId = (int) $expenseCategory->id;
                }
                if (! DB::table('mobile_categories')->where('name', $name)->exists()) {
                    $now = now();
                    DB::table('mobile_categories')->insert([
                        'name' => $name,
                        'category_kind' => 'expense',
                        'expense_category_id' => $expenseId,
                        'requires_notes' => $name === 'مصاريف أخرى',
                        'is_system' => true,
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                } else {
                    $mobileCategory = DB::table('mobile_categories')->where('name', $name)->first();
                    if ($mobileCategory->category_kind !== 'expense'
                        || (int) $mobileCategory->expense_category_id !== $expenseId
                        || ($name === 'مصاريف أخرى' && ! (bool) $mobileCategory->requires_notes)) {
                        throw new RuntimeException("The existing {$name} mobile category is not aligned with its canonical expense category.");
                    }
                }
            }
        }, 5);
    }
}
