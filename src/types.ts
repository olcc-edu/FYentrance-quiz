export interface Question {
  subject: string;
  topic: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  explanation: string;
  chapterOrder?: number; // Sheet 里的 chapter_order 列
}

export type ViewState =
  | 'login'
  | 'register'
  | 'change_password'
  | 'mode_selection'
  | 'subject'
  | 'topic'
  | 'quiz'
  | 'result'
  | 'paywall'
  | 'profile';

export type AppMode = 'practice' | 'exam';

export type Tier = 'free' | 'premium';

export interface StudentProfile {
  phone: string;         // 主键：家长电话 60XXXXXXXXX
  name: string;
  school: string;
  tier: Tier;
  mustChangePassword: boolean;
  registeredAt: string;
  source?: string;
}

/** 每日章节使用记录（免费用户每天只能做一个章节） */
export interface DailyUsage {
  date: string;   // YYYY-MM-DD (本地时区)
  subject: string;
  topic: string;
}
