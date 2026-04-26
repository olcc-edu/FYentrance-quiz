import React from 'react';
import { motion } from 'motion/react';

const YIESHAN_WHATSAPP = '60107669167'; // 010-7669167 国际格式
const YIESHAN_WA_URL = `https://wa.me/${YIESHAN_WHATSAPP}?text=${encodeURIComponent(
  '你好，我从「宽中入学试刷题宝」看到广告，想咨询毅而山教育中心的补习课程。',
)}`;

const BANNER_SRC = `${import.meta.env.BASE_URL}yieshan-banner.jpg`;

interface Props {
  /** 'login' 顶部出现，'result' 在结果页底部出现 */
  variant?: 'login' | 'result';
}

export default function BrandBanner({ variant = 'login' }: Props) {
  const label =
    variant === 'result'
      ? '想加强备考？联系毅而山教育中心'
      : '本 app 由 毅而山教育中心 倾力赞助';

  return (
    <motion.a
      href={YIESHAN_WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="block rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow ring-1 ring-slate-200 active:scale-[0.99] bg-[#3454A0]"
      aria-label={label}
    >
      <img
        src={BANNER_SRC}
        alt="毅而山教育中心 010-7669167 - 独中各科补习"
        loading="lazy"
        className="w-full block select-none"
        draggable={false}
      />
      <div className="text-[11px] text-white/90 text-center py-1 bg-[#3454A0] tracking-wide">
        点击横幅 → WhatsApp 咨询补习
      </div>
    </motion.a>
  );
}
