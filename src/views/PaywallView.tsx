import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Crown, CheckCircle2, X, MessageCircle, RefreshCcw, Loader2 } from 'lucide-react';
import type { StudentProfile } from '../types';
import { queryAccount } from '../services/accountService';

// ⚠️ 换成你的 WhatsApp 客服号码（国际格式不带 + 号）
const ADMIN_WHATSAPP = '60165789873';
const PRICE_LABEL = 'RM 30 / 全年';

interface Props {
  profile: StudentProfile;
  onUpgrade: (next: StudentProfile) => void;
  onClose: () => void;
}

export default function PaywallView({ profile, onUpgrade, onClose }: Props) {
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setChecking(true);
    setErr(null);
    try {
      const updated = await queryAccount(profile.phone);
      if (!updated) {
        setErr('账号查询失败，请稍后再试');
        return;
      }
      if (updated.tier === 'premium') {
        localStorage.setItem('student_profile', JSON.stringify(updated));
        onUpgrade(updated);
      } else {
        setErr('账号状态仍是免费版，请确认已完成付款');
      }
    } catch (e: any) {
      setErr('刷新失败：' + (e?.message || ''));
    } finally {
      setChecking(false);
    }
  };

  const waText = encodeURIComponent(
    `你好 Admin，我要升级付费版。\n电话：${profile.phone}\n姓名：${profile.name}\n小学：${profile.school}`,
  );
  const waUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${waText}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="relative bg-gradient-to-br from-amber-400 via-orange-400 to-pink-500 rounded-3xl p-8 text-white shadow-xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition"
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
            <Crown className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider opacity-90">升级至付费版</p>
            <h2 className="text-2xl font-bold">解锁无限刷题</h2>
            <p className="text-sm mt-1 opacity-90">{PRICE_LABEL}</p>
          </div>
        </div>

        <ul className="mt-6 space-y-2 text-sm">
          {[
            '每天不限次数刷题（免费版每天只能做 1 章）',
            '全科目、全章节完整解锁',
            '模拟考卷 40 题',
            '完整答题解析',
            '优先获得新增题目',
          ].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Step 1: WhatsApp to admin */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center justify-center font-bold">
            1
          </span>
          WhatsApp 联络管理员付款
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          点击下方按钮，系统会自动打开 WhatsApp
          并带上你的账号信息。管理员会引导你完成付款。
        </p>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition"
        >
          <MessageCircle className="w-5 h-5" />
          WhatsApp 联络管理员
        </a>
      </div>

      {/* Step 2: Refresh */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center justify-center font-bold">
            2
          </span>
          付款完成后，刷新账号状态
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          管理员确认付款后，会在系统中将你的账号升级为付费版。
          你在这里按「刷新」即可生效。
        </p>
        <button
          onClick={refresh}
          disabled={checking}
          className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
        >
          {checking ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCcw className="w-5 h-5" />
          )}
          {checking ? '查询中…' : '刷新账号状态'}
        </button>
        {err && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {err}
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 text-slate-500 font-medium hover:text-slate-700 transition"
      >
        稍后再说
      </button>
    </motion.div>
  );
}
