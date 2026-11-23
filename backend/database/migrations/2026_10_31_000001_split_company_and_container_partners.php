<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table): void {
            $table->boolean('is_company_partner')->default(true)->after('phone');
        });

        Schema::create('container_partners', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('name', 160);
            $table->string('phone', 80)->nullable();
            $table->string('status', 24)->default('active');
            $table->unsignedBigInteger('created_by_user_id')->nullable();
            $table->timestamps();
            $table->index(['status', 'name', 'id'], 'ix_container_partners_status_name');
        });

        $legacyPartnerIds = DB::table('partner_installment_plans')
            ->whereNotNull('partner_id')
            ->distinct()
            ->orderBy('partner_id')
            ->pluck('partner_id');

        foreach ($legacyPartnerIds as $partnerId) {
            $partner = DB::table('partners')->where('id', $partnerId)->first([
                'id', 'name', 'phone', 'status', 'created_by_user_id', 'created_at', 'updated_at',
            ]);
            if ($partner === null) {
                continue;
            }

            DB::table('container_partners')->insertOrIgnore([
                'id' => $partner->id,
                'name' => $partner->name,
                'phone' => $partner->phone,
                'status' => $partner->status === 'inactive' ? 'inactive' : 'active',
                'created_by_user_id' => $partner->created_by_user_id,
                'created_at' => $partner->created_at ?? now(),
                'updated_at' => $partner->updated_at ?? now(),
            ]);
        }

        if ($legacyPartnerIds->isNotEmpty()) {
            $companyPartnerIds = DB::table('sales_documents')
                ->where('issuer_type', 'partner')
                ->whereIn('issuer_partner_id', $legacyPartnerIds)
                ->pluck('issuer_partner_id')
                ->merge(DB::table('partner_profit_ledger')->whereIn('partner_id', $legacyPartnerIds)->pluck('partner_id'))
                ->merge(DB::table('partner_payments')->whereIn('partner_id', $legacyPartnerIds)->pluck('partner_id'))
                ->merge(DB::table('pending_funds')->whereIn('partner_id', $legacyPartnerIds)->pluck('partner_id'))
                ->unique()
                ->values();
            $containerOnlyIds = $legacyPartnerIds->diff($companyPartnerIds)->values();
            if ($containerOnlyIds->isNotEmpty()) {
                DB::table('partners')->whereIn('id', $containerOnlyIds)->update(['is_company_partner' => false]);
            }
        }

        Schema::table('partner_installment_plans', function (Blueprint $table): void {
            $table->unsignedBigInteger('container_partner_id')->nullable()->after('partner_id');
            $table->foreign('container_partner_id', 'fk_partner_installment_plans_container_partner')
                ->references('id')->on('container_partners')->restrictOnDelete();
            $table->index(['container_partner_id', 'status', 'id'], 'ix_container_installments_partner_status');
        });

        DB::table('partner_installment_plans')->whereNotNull('partner_id')->update([
            'container_partner_id' => DB::raw('partner_id'),
        ]);

        Schema::table('partner_installment_plans', function (Blueprint $table): void {
            $table->dropForeign(['partner_id']);
            $table->unsignedBigInteger('partner_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        throw new LogicException('Company and container partner separation is forward-only.');
    }
};
