<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $permissions = [
        'data.import.manage' => 'Preview and apply idempotent CSV imports.',
        'data.daily_summary.view' => 'View the real daily business summary.',
        'system.backups.view' => 'View database backup job status.',
        'system.backups.create' => 'Queue a database backup job.',
        'global_search.use' => 'Search business records allowed by the user role.',
        'notifications.view' => 'View and acknowledge business notifications.',
        'trash.delete' => 'Permanently delete an archived record.',
        'trash.empty' => 'Permanently empty the recycle bin.',
    ];

    public function up(): void
    {
        Schema::create('csv_import_staging', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('import_type', 40);
            $table->char('checksum', 64);
            $table->string('file_path', 500);
            $table->unsignedInteger('row_count')->default(0);
            $table->json('errors');
            $table->string('status', 24)->default('previewed');
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at');
            $table->timestamp('applied_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'expires_at']);
        });

        Schema::create('csv_import_batches', function (Blueprint $table): void {
            $table->id();
            $table->string('import_type', 40);
            $table->char('checksum', 64);
            $table->unsignedInteger('row_count');
            $table->unsignedInteger('imported_count');
            $table->foreignId('applied_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('applied_at')->useCurrent();
            $table->unique(['import_type', 'checksum'], 'uq_csv_import_content');
        });

        Schema::create('backup_jobs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('status', 24)->default('queued');
            $table->string('file_name', 255)->nullable();
            $table->unsignedBigInteger('file_bytes')->nullable();
            $table->text('result_message')->nullable();
            $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
            $table->index(['created_at', 'status']);
        });

        Schema::create('user_notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('source_key', 180);
            $table->string('notification_type', 40);
            $table->string('title', 180);
            $table->string('message', 500);
            $table->string('target_path', 500)->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'source_key'], 'uq_user_notification_source');
            $table->index(['user_id', 'read_at', 'created_at']);
        });

        Schema::table('trash_items', function (Blueprint $table): void {
            $table->foreignId('permanently_deleted_by_user_id')->nullable()->after('restored_at')->constrained('users')->nullOnDelete();
            $table->timestamp('permanently_deleted_at')->nullable()->after('permanently_deleted_by_user_id');
        });

        foreach ($this->permissions as $code => $description) {
            DB::table('permissions')->updateOrInsert(
                ['code' => $code],
                ['description' => $description, 'created_at' => now()],
            );
        }

        $grants = [
            'owner' => array_keys($this->permissions),
            'admin' => ['data.daily_summary.view', 'global_search.use', 'notifications.view'],
            'accountant' => ['data.daily_summary.view', 'global_search.use', 'notifications.view'],
            'read_only' => ['global_search.use', 'notifications.view'],
            'designated_invoice_issuer' => ['global_search.use', 'notifications.view'],
            'driver' => ['global_search.use', 'notifications.view'],
        ];
        foreach ($grants as $roleCode => $codes) {
            $roleId = DB::table('roles')->where('code', $roleCode)->value('id');
            if ($roleId === null) {
                continue;
            }
            $permissionIds = DB::table('permissions')->whereIn('code', $codes)->pluck('id');
            foreach ($permissionIds as $permissionId) {
                DB::table('role_permissions')->insertOrIgnore([
                    'role_id' => $roleId,
                    'permission_id' => $permissionId,
                    'granted_at' => now(),
                ]);
            }
        }

        $auditPermissionId = DB::table('permissions')->where('code', 'audit_logs.view')->value('id');
        $ownerId = DB::table('roles')->where('code', 'owner')->value('id');
        if ($auditPermissionId !== null) {
            DB::table('role_permissions')->where('permission_id', $auditPermissionId)
                ->when($ownerId !== null, fn ($query) => $query->where('role_id', '<>', $ownerId))
                ->delete();
        }
    }

    public function down(): void
    {
        Schema::table('trash_items', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('permanently_deleted_by_user_id');
            $table->dropColumn('permanently_deleted_at');
        });
        Schema::dropIfExists('user_notifications');
        Schema::dropIfExists('backup_jobs');
        Schema::dropIfExists('csv_import_batches');
        Schema::dropIfExists('csv_import_staging');
        $ids = DB::table('permissions')->whereIn('code', array_keys($this->permissions))->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('code', array_keys($this->permissions))->delete();
    }
};
