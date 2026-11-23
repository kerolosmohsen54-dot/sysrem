<?php
namespace Tests\Concerns;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
trait AuthenticatesApi {
 protected function createApiUser(array $overrides=[]): int { return (int) DB::table('users')->insertGetId(array_replace(['username'=>'probe_'.bin2hex(random_bytes(4)),'display_name'=>'API Probe','password_hash'=>Hash::make('probe'),'is_active'=>true,'created_at'=>now(),'updated_at'=>now()],$overrides)); }
 protected function createApiSession(int $userId, bool $stepUp=false): array { $token=bin2hex(random_bytes(32)); $csrf=bin2hex(random_bytes(32)); $id=(int) DB::table('auth_sessions')->insertGetId(['user_id'=>$userId,'token_hash'=>hash('sha256',$token,true),'csrf_token_hash'=>hash('sha256',$csrf,true),'expires_at'=>now()->addHours(12),'last_seen_at'=>now(),'step_up_verified_at'=>$stepUp?now():null,'created_at'=>now()]); return ['id'=>$id,'token'=>$token,'csrf'=>$csrf]; }
 protected function actingAsApiUser(array|string $roleCode='read_only', bool $stepUp=false): array { $userId=$this->createApiUser(); $code=is_string($roleCode)?$roleCode:'read_only'; $roleId=DB::table('roles')->where('code',$code)->value('id'); if($roleId){DB::table('user_roles')->insert(['user_id'=>$userId,'role_id'=>$roleId]);} $session=$this->createApiSession($userId,$stepUp); return ['user_id'=>$userId,'token'=>$session['token'],'csrf'=>$session['csrf']]; }
 protected function apiCookieName(): string { return (string) config('auth.api_session.cookie'); }
 protected function apiCsrfHeader(): string { return 'X-CSRF-Token'; }
}
