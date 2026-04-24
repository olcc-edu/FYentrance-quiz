import type { StudentProfile } from '../types';
import { sha256Hex } from '../lib/crypto';

// ⚠️ 部署 Apps Script 后把这个 URL 换成你的 /exec 网址
export const REGISTER_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbxnXvpKOU_fNqCNPEAtvpUFqDCm80RJbJGZ-4lSlTg-Y-5WhFoO3I0RBF6LIsWWUq_vlQ/exec';

function isConfigured(): boolean {
  return REGISTER_WEBHOOK_URL.includes('script.google.com') &&
    !REGISTER_WEBHOOK_URL.includes('REPLACE_ME');
}

async function post(body: Record<string, unknown>): Promise<any> {
  if (!isConfigured()) throw new Error('NOT_CONFIGURED');
  const res = await fetch(REGISTER_WEBHOOK_URL, {
    method: 'POST',
    // 用 text/plain 避免 CORS 预检
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  });
  return res.json();
}

function toProfile(p: any): StudentProfile {
  return {
    phone: String(p.phone || ''),
    name: String(p.name || ''),
    school: String(p.school || ''),
    tier: p.tier === 'premium' ? 'premium' : 'free',
    mustChangePassword: !!p.mustChangePassword,
    registeredAt: p.registeredAt || new Date().toISOString(),
  };
}

// --- 公开 API ---------------------------------------------------------------

export interface RegisterPayload {
  phone: string;
  name: string;
  school: string;
  source?: string;
}

/** 新用户注册。默认密码 1234 已在 Apps Script 内写入。 */
export async function registerNewUser(
  payload: RegisterPayload,
): Promise<StudentProfile> {
  const data = await post({ action: 'register', ...payload });
  if (!data.ok) throw new Error(data.error || 'register_failed');
  return toProfile(data.profile);
}

/** 登入：电话 + 明文密码（客户端先哈希再发送）。 */
export async function login(
  phone: string,
  plainPassword: string,
): Promise<StudentProfile> {
  const password_hash = await sha256Hex(plainPassword);
  const data = await post({ action: 'login', phone, password_hash });
  if (!data.ok) throw new Error(data.error || 'login_failed');
  return toProfile(data.profile);
}

/** 修改密码。 */
export async function changePassword(
  phone: string,
  oldPlain: string,
  newPlain: string,
): Promise<StudentProfile> {
  const old_password_hash = await sha256Hex(oldPlain);
  const new_password_hash = await sha256Hex(newPlain);
  const data = await post({
    action: 'change_password',
    phone,
    old_password_hash,
    new_password_hash,
  });
  if (!data.ok) throw new Error(data.error || 'change_password_failed');
  return toProfile(data.profile);
}

/** 仅查询（刷新 tier 状态用，无需密码） */
export async function queryAccount(
  phone: string,
): Promise<StudentProfile | null> {
  try {
    const data = await post({ action: 'query', phone });
    if (!data.ok) return null;
    return toProfile(data.profile);
  } catch {
    return null;
  }
}

export function isBackendConfigured(): boolean {
  return isConfigured();
}
