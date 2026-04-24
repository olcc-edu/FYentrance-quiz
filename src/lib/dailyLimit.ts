/**
 * 每日限额：免费用户每天只能做 1 个章节。
 * 记录存在 localStorage，用电话作 key。跨设备不同步（MVP）。
 */
import type { DailyUsage } from '../types';

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function storageKey(phone: string): string {
  return `daily_usage_${phone}`;
}

/** 读取当前用户今日的使用记录（若不是今天自动失效 → 返回 null） */
export function getTodayUsage(phone: string): DailyUsage | null {
  try {
    const raw = localStorage.getItem(storageKey(phone));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyUsage;
    if (parsed.date !== todayKey()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 记录今日做过的章节 */
export function setTodayUsage(
  phone: string,
  subject: string,
  topic: string,
): void {
  const usage: DailyUsage = { date: todayKey(), subject, topic };
  localStorage.setItem(storageKey(phone), JSON.stringify(usage));
}

/**
 * 免费用户能否开始指定章节：
 * - 今日还没做任何章节 → 可以
 * - 今日做的就是这一章节 → 可以（继续做同一章）
 * - 今日已做过其他章节 → 不可以，需要等明天或升级
 */
export function canStartTopic(
  phone: string,
  subject: string,
  topic: string,
): { ok: true } | { ok: false; usedSubject: string; usedTopic: string } {
  const usage = getTodayUsage(phone);
  if (!usage) return { ok: true };
  if (usage.subject === subject && usage.topic === topic) return { ok: true };
  return { ok: false, usedSubject: usage.subject, usedTopic: usage.topic };
}
