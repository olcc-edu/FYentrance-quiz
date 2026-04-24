import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { JOHOR_SJKC } from '../data/johorSjkc';
import type { StudentProfile } from '../types';
import { registerNewUser } from '../services/accountService';

interface Props {
  onDone: (profile: StudentProfile) => void;
  onGoLogin: () => void;
  source?: string;
}

export default function RegisterView({ onDone, onGoLogin, source }: Props) {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [schoolOther, setSchoolOther] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (name.trim().length < 2) return setErr('请填写真实姓名（至少 2 字）');
    if (!school) return setErr('请选择目前就读小学');
    if (school === '其他' && !schoolOther.trim()) {
      return setErr('请输入你的小学名称');
    }
    if (!/^60\d{8,10}$/.test(phone)) {
      return setErr('联络号码格式错误，请以 60 开头，例：60123456789');
    }

    setLoading(true);
    try {
      const profile = await registerNewUser({
        phone,
        name: name.trim(),
        school: school === '其他' ? schoolOther.trim() : school,
        source,
      });
      localStorage.setItem('student_profile', JSON.stringify(profile));
      onDone(profile);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg === 'NOT_CONFIGURED') {
        setErr('后端尚未配置（请先部署 Apps Script 并填入 webhook URL）');
      } else if (msg.includes('phone_already_registered')) {
        setErr('此电话已注册，请直接登入');
      } else {
        setErr('注册失败：' + msg);
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
          <UserPlus className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">注册新账号</h1>
        <p className="text-slate-500 text-sm">宽中入学试刷题宝</p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed">
          <span className="font-bold">请填写真实信息</span>
          ，以便账号与题库记录匹配，并推送适合你的题目。
          <br />
          注册后默认密码为 <span className="font-mono font-bold">1234</span>
          ，登入后需自行修改。
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">学生姓名</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="例：陈小明"
            className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">目前就读小学</span>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none appearance-none"
          >
            <option value="">-- 请选择 --</option>
            {Object.entries(JOHOR_SJKC).map(([daerah, schools]) => (
              <optgroup key={daerah} label={daerah}>
                {schools.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="其他">其他（自行填写）</option>
          </select>
        </label>

        {school === '其他' && (
          <input
            type="text"
            value={schoolOther}
            onChange={(e) => setSchoolOther(e.target.value)}
            placeholder="请输入你的小学名称"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        )}

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            家长联络电话（也是登入账号）
          </span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="60123456789"
            className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
          <span className="text-xs text-slate-400 mt-1 block">
            请以 60 开头（马来西亚手机），日后以此电话登入
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
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )}
          {loading ? '注册中…' : '注册并开始刷题'}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={onGoLogin}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          已有账号？返回登入 →
        </button>
      </div>
    </motion.div>
  );
}
