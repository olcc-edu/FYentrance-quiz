import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, LogIn, Loader2 } from 'lucide-react';
import type { StudentProfile } from '../types';
import { login } from '../services/accountService';

interface Props {
  onSuccess: (profile: StudentProfile) => void;
  onGoRegister: () => void;
}

export default function LoginView({ onSuccess, onGoRegister }: Props) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!/^60\d{8,10}$/.test(phone)) {
      return setErr('电话格式错误，请以 60 开头，例：60123456789');
    }
    if (password.length < 4) {
      return setErr('密码至少 4 位');
    }
    setLoading(true);
    try {
      const profile = await login(phone, password);
      localStorage.setItem('student_profile', JSON.stringify(profile));
      onSuccess(profile);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg === 'NOT_CONFIGURED') {
        setErr('后端尚未配置（请先部署 Apps Script 并填入 webhook URL）');
      } else if (msg.includes('account_not_found')) {
        setErr('找不到此账号，请先注册');
      } else if (msg.includes('wrong_password')) {
        setErr('密码错误');
      } else {
        setErr('登入失败：' + msg);
      }
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
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">欢迎回来</h1>
        <p className="text-slate-500 text-sm">宽中入学试刷题宝</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">家长联络电话</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="60123456789"
            className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">密码</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="默认密码：1234"
            className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
          />
          <span className="text-xs text-slate-400 mt-1 block">
            首次登入请用默认密码 <span className="font-mono font-bold">1234</span>
            ，登入后需自行修改
          </span>
        </label>

        {err && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          {loading ? '登入中…' : '登入'}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={onGoRegister}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          还没注册？点这里 →
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 leading-relaxed">
        <p className="font-semibold text-slate-600 mb-1">忘记密码？</p>
        请 WhatsApp 联络客服
        <a
          href="https://wa.me/60165789873"
          className="text-blue-600 font-semibold ml-1"
        >
          +6016-578 9873
        </a>
        ，管理员协助重置为默认密码 1234。
      </div>
    </motion.div>
  );
}
