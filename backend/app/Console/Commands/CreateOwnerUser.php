<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateOwnerUser extends Command
{
    protected $signature = 'users:create-owner';

    protected $description = 'Create an owner account with a password entered interactively.';

    public function handle(): int
    {
        $ownerRoleId = DB::table('roles')
            ->where('code', 'owner')
            ->where('is_active', true)
            ->value('id');

        if ($ownerRoleId === null) {
            $this->error('The active owner role is missing. Seed the role/permission matrix first.');

            return self::FAILURE;
        }

        $username = trim((string) $this->ask('Username'));
        $displayName = trim((string) $this->ask('Display name'));

        $validator = Validator::make(
            ['username' => $username, 'display_name' => $displayName],
            [
                'username' => ['required', 'string', 'max:100', 'unique:users,username'],
                'display_name' => ['required', 'string', 'max:160'],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $password = $this->secret('Password');
        $passwordConfirmation = $this->secret('Confirm password');

        if (! is_string($password) || mb_strlen($password) < 12 || mb_strlen($password) > 1024) {
            $this->error('The password must be between 12 and 1024 characters.');

            return self::FAILURE;
        }

        if (! is_string($passwordConfirmation) || ! hash_equals($password, $passwordConfirmation)) {
            $this->error('The password confirmation does not match.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($displayName, $ownerRoleId, $password, $username): void {
            $now = now();
            $userId = DB::table('users')->insertGetId([
                'username' => $username,
                'display_name' => $displayName,
                'password_hash' => Hash::make($password),
                'is_active' => true,
                'password_changed_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('user_roles')->insert([
                'user_id' => $userId,
                'role_id' => $ownerRoleId,
                'granted_by_user_id' => null,
                'granted_at' => $now,
            ]);
        });

        $this->info("Owner account {$username} created.");

        return self::SUCCESS;
    }
}
