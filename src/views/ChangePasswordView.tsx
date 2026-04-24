import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import type { StudentProfile } from '../types';
import { changePassword } from '../services/accountService';

interface Props {
  profile: StudentProfile;
  forced: boolean; // true = 首次登入强制改
  onDone: (profile: StudentProfile) => void;
  onCancel?: () => void;
}

export default function ChangePasswordView({
  profile,
  forced,
  onDone,
  onCancel,
}: Props) {
  const [oldPw, setOldPw] = useState(forced ? '1234' : '');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (oldPw.length < 4) return setErr('请输入旧密码');
    if (newPw.length < 4) return setErr('新密码至少 4 位');
    if (newPw.length > 32) return setErr('新密码不要超过 32 位');
    if (newPw === '1234') return setErr('新密码不能是默认密码 1234');
    if (newPw !== confirmPw) return setErr('两次输入的新密码不一致');
    if (newPw === oldPw) return setErr('新密码不能和旧密码相同');

    setLoading(true);
    try {
      const updated = await changePassword(profile.phone, oldPw, newPw);
      localStorage.setItem('student_profile', JSON.stringify(updated));
      onDone(updated);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('wrong_password')) setErr('旧密码错误');
      else setErr('修改失败：' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <KeyRound className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">
          {forced ? '请先修改密码' : '修改密码'}
        </h1>
        <p className="text-slate-500 text-sm">
          {forced
            ? '为了账号安全，首次登入请自行设置新密码'
            : '旧密码验证后即可更换'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">旧密码</span>
          <input
            type="password"
            autoComplete="current-password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            placeholder="首次登入请填 1234"
            className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">新密码</span>
          <input
            type="password"
            autoComplete="new-password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="至少 4 位"
            className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">确认新密码</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="再输入一次"
            className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </label>

        {err && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
          {loading ? '保存中…' : '保存新密码'}
        </button>

        {!forced && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 text-slate-500 hover:text-slate-700 font-medium"
          >
            取消
          </button>
        )}
      </form>

      <p className="text-xs text-slate-400 text-center leading-relaxed px-4">
        密码经 SHA-256 加密后才发送，服务器不会保存明文。
        <br />
        忘记密码可通过 WhatsApp 联络客服重置。
      </p>
    </motion.div>
  );
}
