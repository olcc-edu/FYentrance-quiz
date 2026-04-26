import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, MessageCircle, ChevronRight } from 'lucide-react';

const YIESHAN_WHATSAPP = '60107669167'; // 010-7669167 国际格式
const YIESHAN_WA_URL = `https://wa.me/${YIESHAN_WHATSAPP}?text=${encodeURIComponent(
  '你好，我从「宽中入学试刷题宝」看到广告，想咨询毅而山教育中心的补习课程。',
)}`;

const BANNER_SRC = `${import.meta.env.BASE_URL}yieshan-banner.jpg`;

interface Props {
  /**
   * 'home'    精简文字横条（主页用，避免每次都看到大图）
   * 'login'   首屏完整图片版（登入页第一印象）
   * 'result'  结果页完整图片版 + 「想加强备考」文案
   */
  variant?: 'home' | 'login' | 'result';
}

export default function BrandBanner({ variant = 'login' }: Props) {
  // 主页精简版：一行细条，logo 图标 + 文字 + 箭头
  if (variant === 'home') {
    return (
      <motion.a
        href={YIESHAN_WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition active:scale-[0.99]"
        aria-label="毅而山教育中心 - WhatsApp 咨询"
      >
        <div className="w-8 h-8 rounded-full bg-[#3454A0] flex items-center justify-center shrink-0">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs text-slate-400 leading-tight">本 app 由 毅而山教育中心 赞助</p>
          <p className="text-sm font-semibold text-slate-700 leading-tight">
            补习咨询：010-7669167
          </p>
        </div>
        <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 -ml-1" />
      </motion.a>
    );
  }

  // 完整图片版（login + result）
  const cta =
    variant === 'result'
      ? '想加强备考？点击 → WhatsApp 咨询毅而山补习'
      : '点击横幅 → WhatsApp 咨询补习';

  return (
    <motion.a
      href={YIESHAN_WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="block rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow ring-1 ring-slate-200 active:scale-[0.99] bg-[#3454A0]"
      aria-label={cta}
    >
      <img
        src={BANNER_SRC}
        alt="毅而山教育中心 010-7669167 - 独中各科补习"
        loading="lazy"
        className="w-full block select-none"
        draggable={false}
      />
      <div className="text-[11px] text-white/90 text-center py-1 bg-[#3454A0] tracking-wide">
        {cta}
      </div>
    </motion.a>
  );
}
