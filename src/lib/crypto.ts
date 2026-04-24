/**
 * 客户端 SHA-256 → hex。用来把密码哈希后再发送。
 * 密码从不以明文传输或存储。
 */
export async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 预计算默认密码哈希（避免每次都算）
export const DEFAULT_PASSWORD_HASH =
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
