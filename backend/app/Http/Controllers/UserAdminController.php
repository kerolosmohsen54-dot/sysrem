<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserAdminController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(Request $request): JsonResponse
    {
        $filters = ListQuery::validate($request, [
            'username' => 'username',
            'display_name' => 'display_name',
            'id' => 'id',
        ]);
        $query = DB::table('users')
            ->select(['id', 'username', 'phone', 'email', 'display_name', 'is_active', 'last_login_at', 'created_at']);
        ListQuery::search($query, $filters, ['username', 'display_name', 'phone', 'email']);
        ListQuery::sort($query, $filters, [
            'username' => 'username',
            'display_name' => 'display_name',
            'id' => 'id',
        ], 'display_name');
        $page = $query->paginate($filters['per_page'] ?? 50);
        $userIds = $page->getCollection()->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $roles = DB::table('user_roles as user_role')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->whereIn('user_role.user_id', $userIds)
            ->where('role.is_active', true)
            ->orderBy('role.code')
            ->get(['user_role.user_id', 'role.code', 'role.name'])
            ->groupBy('user_id');
        $permissions = DB::table('user_roles as user_role')
            ->join('role_permissions as role_permission', 'role_permission.role_id', '=', 'user_role.role_id')
            ->join('permissions as permission', 'permission.id', '=', 'role_permission.permission_id')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->whereIn('user_role.user_id', $userIds)
            ->where('role.is_active', true)
            ->orderBy('permission.code')
            ->get(['user_role.user_id', 'permission.code'])
            ->groupBy('user_id');
        $page->getCollection()->transform(static function (object $user) use ($roles, $permissions): array {
            return [
                ...(array) $user,
                'is_active' => (bool) $user->is_active,
                'roles' => $roles->get($user->id, collect())->map(static fn (object $role): array => [
                    'code' => $role->code,
                    'name' => $role->name,
                ])->values(),
                'permissions' => $permissions->get($user->id, collect())
                    ->pluck('code')
                    ->unique()
                    ->values(),
            ];
        });

        $payload = ListQuery::page($page);
        $payload['meta']['active_user_count'] = DB::table('users')->where('is_active', true)->count();
        $payload['meta']['max_active_users'] = (int) (DB::table('user_account_limits')->where('id', 1)->value('max_active_users') ?? 10);

        return response()->json($payload);
    }

    public function roles(): JsonResponse
    {
        $roles = DB::table('roles')->where('is_active', true)->orderBy('name')->get(['code', 'name']);
        return response()->json(['data' => $roles]);
    }

    public function store(Request $request): JsonResponse
    {
        $values = $request->validate([
            'username' => ['required', 'string', 'max:100', 'unique:users,username'],
            'display_name' => ['required', 'string', 'max:160'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32', 'unique:users,phone'],
            'email' => ['sometimes', 'nullable', 'email', 'max:254', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'max:1024', 'confirmed'],
            'role_codes' => ['required', 'array', 'min:1'],
            'role_codes.*' => ['required', 'string', 'distinct', Rule::exists('roles', 'code')->where('is_active', true)],
        ]);
        $actor = $this->actor($request);

        $userId = DB::transaction(function () use ($request, $values, $actor): int {
            $this->assertAccountCapacity();
            $now = now();
            $userId = (int) DB::table('users')->insertGetId([
                'username' => $values['username'],
                'display_name' => $values['display_name'],
                'phone' => $values['phone'] ?? null,
                'email' => $values['email'] ?? null,
                'password_hash' => Hash::make($values['password']),
                'password_changed_at' => $now,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $roleIds = DB::table('roles')->whereIn('code', $values['role_codes'])->where('is_active', true)->pluck('id');
            foreach ($roleIds as $roleId) {
                DB::table('user_roles')->insert([
                    'user_id' => $userId,
                    'role_id' => $roleId,
                    'granted_by_user_id' => $actor->id,
                    'granted_at' => $now,
                ]);
            }
            $this->auditLog->record($request, 'user.created', 'user', $userId, null, null, [
                'username' => $values['username'],
                'display_name' => $values['display_name'],
                'role_codes' => $values['role_codes'],
            ]);

            return $userId;
        }, 5);

        return response()->json(['data' => $this->userResource($userId)], 201);
    }

    public function update(Request $request, int $userId): JsonResponse
    {
        $values = $request->validate([
            'username' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('users', 'username')->ignore($userId)],
            'display_name' => ['sometimes', 'required', 'string', 'max:160'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32', Rule::unique('users', 'phone')->ignore($userId)],
            'email' => ['sometimes', 'nullable', 'email', 'max:254', Rule::unique('users', 'email')->ignore($userId)],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        if ($values === []) {
            throw ValidationException::withMessages(['request' => ['At least one field must be provided.']]);
        }
        $actor = $this->actor($request);
        if (($values['is_active'] ?? true) === false && (int) $actor->id === $userId) {
            throw ValidationException::withMessages(['is_active' => ['You cannot deactivate your own account.']]);
        }

        DB::transaction(function () use ($request, $userId, $values): void {
            $before = DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            abort_if($before === null, 404);
            if (($values['is_active'] ?? false) === true && ! (bool) $before->is_active) {
                $this->assertAccountCapacity();
            }
            if (($values['is_active'] ?? true) === false && (bool) $before->is_active) {
                $this->assertCanDeactivate($userId);
            }
            $now = now();
            DB::table('users')->where('id', $userId)->update([...$values, 'updated_at' => $now]);
            if (($values['is_active'] ?? true) === false) {
                DB::table('auth_sessions')->where('user_id', $userId)->whereNull('revoked_at')->update(['revoked_at' => $now]);
            }
            $after = DB::table('users')->where('id', $userId)->first();
            $this->auditLog->record($request, 'user.updated', 'user', $userId, null, (array) $before, (array) $after);
        }, 5);

        return response()->json(['data' => $this->userResource($userId)]);
    }

    public function destroy(Request $request, int $userId): JsonResponse
    {
        $actor = $this->actor($request);
        if ((int) $actor->id === $userId) {
            throw ValidationException::withMessages(['user' => ['You cannot deactivate your own account.']]);
        }

        DB::transaction(function () use ($request, $userId): void {
            $target = DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            abort_if($target === null, 404);
            if (! (bool) $target->is_active) {
                return;
            }
            $this->assertCanDeactivate($userId);
            $now = now();
            DB::table('users')->where('id', $userId)->update(['is_active' => false, 'updated_at' => $now]);
            DB::table('auth_sessions')->where('user_id', $userId)->whereNull('revoked_at')->update(['revoked_at' => $now]);
            $this->auditLog->record($request, 'user.deactivated', 'user', $userId, null, (array) $target, [
                'is_active' => false,
            ]);
        }, 5);

        return response()->json(['data' => ['id' => $userId, 'deleted' => true, 'is_active' => false]]);
    }

    public function assignRoles(Request $request, int $userId): JsonResponse
    {
        $values = $request->validate([
            'role_codes' => ['required', 'array', 'min:1'],
            'role_codes.*' => ['required', 'string', 'distinct', Rule::exists('roles', 'code')->where('is_active', true)],
        ]);
        $actor = $this->actor($request);

        DB::transaction(function () use ($request, $userId, $values, $actor): void {
            $target = DB::table('users')->where('id', $userId)->lockForUpdate()->first(['id']);
            abort_if($target === null, 404);
            $before = DB::table('user_roles as user_role')
                ->join('roles as role', 'role.id', '=', 'user_role.role_id')
                ->where('user_role.user_id', $userId)
                ->orderBy('role.code')
                ->pluck('role.code')
                ->all();
            $requested = array_values(array_unique($values['role_codes']));
            if (in_array('owner', $before, true) && ! in_array('owner', $requested, true)) {
                $activeOwners = DB::table('user_roles as user_role')
                    ->join('roles as role', 'role.id', '=', 'user_role.role_id')
                    ->join('users as owner_user', 'owner_user.id', '=', 'user_role.user_id')
                    ->where('role.code', 'owner')
                    ->where('role.is_active', true)
                    ->where('owner_user.is_active', true)
                    ->count();
                if ($activeOwners <= 1) {
                    throw ValidationException::withMessages(['role_codes' => ['At least one active owner account must remain.']]);
                }
            }
            DB::table('user_roles')->where('user_id', $userId)->delete();
            $now = now();
            foreach (DB::table('roles')->whereIn('code', $requested)->where('is_active', true)->pluck('id') as $roleId) {
                DB::table('user_roles')->insert([
                    'user_id' => $userId,
                    'role_id' => $roleId,
                    'granted_by_user_id' => $actor->id,
                    'granted_at' => $now,
                ]);
            }
            $this->auditLog->record($request, 'user.roles_assigned', 'user', $userId, null, [
                'role_codes' => $before,
            ], [
                'role_codes' => $requested,
            ]);
        }, 5);

        return response()->json(['data' => $this->userResource($userId)]);
    }

    private function userResource(int $userId): array
    {
        $user = DB::table('users')
            ->where('id', $userId)
            ->first(['id', 'username', 'phone', 'email', 'display_name', 'is_active', 'last_login_at', 'created_at']);
        abort_if($user === null, 404);
        $roles = DB::table('user_roles as user_role')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $userId)
            ->where('role.is_active', true)
            ->orderBy('role.code')
            ->get(['role.code', 'role.name']);
        $permissions = DB::table('role_permissions as role_permission')
            ->join('permissions as permission', 'permission.id', '=', 'role_permission.permission_id')
            ->join('user_roles as user_role', 'user_role.role_id', '=', 'role_permission.role_id')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $userId)
            ->where('role.is_active', true)
            ->orderBy('permission.code')
            ->distinct()
            ->pluck('permission.code')
            ->all();

        return [
            ...(array) $user,
            'is_active' => (bool) $user->is_active,
            'roles' => $roles,
            'permissions' => $permissions,
        ];
    }

    private function actor(Request $request): object
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_unless(is_object($actor) && isset($actor->id), 401);

        return $actor;
    }

    private function assertAccountCapacity(): void
    {
        $limit = DB::table('user_account_limits')->where('id', 1)->lockForUpdate()->first();
        if ($limit === null) {
            throw new \RuntimeException('The user account limit configuration is missing.');
        }
        $activeCount = DB::table('users')->where('is_active', true)->count();
        if ($activeCount >= (int) $limit->max_active_users) {
            throw ValidationException::withMessages([
                'account_limit' => ["The active account limit ({$limit->max_active_users}) has been reached. Increase the limit in settings or deactivate an account."],
            ]);
        }
    }

    private function assertCanDeactivate(int $userId): void
    {
        $ownerRoleId = DB::table('roles')->where('code', 'owner')->lockForUpdate()->value('id');
        if ($ownerRoleId === null || ! DB::table('user_roles')->where('user_id', $userId)->where('role_id', $ownerRoleId)->exists()) {
            return;
        }

        $activeOwners = DB::table('user_roles as user_role')
            ->join('users as owner_user', 'owner_user.id', '=', 'user_role.user_id')
            ->where('user_role.role_id', $ownerRoleId)
            ->where('owner_user.is_active', true)
            ->count();
        if ($activeOwners <= 1) {
            throw ValidationException::withMessages(['is_active' => ['At least one active owner account must remain.']]);
        }
    }
}
