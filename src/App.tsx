import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCcw,
  Trophy,
  Loader2,
  ArrowLeft,
  ClipboardList,
  GraduationCap,
  Lock,
  Crown,
  UserCircle2,
  KeyRound,
  LogOut,
  CalendarClock,
} from 'lucide-react';
import type {
  Question,
  ViewState,
  AppMode,
  StudentProfile,
} from './types';
import { fetchQuestions } from './services/dataService';
import { queryAccount } from './services/accountService';
import { cn } from './lib/utils';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import ChangePasswordView from './views/ChangePasswordView';
import PaywallView from './views/PaywallView';
import BrandBanner from './views/BrandBanner';
import {
  canStartTopic,
  getTodayUsage,
  setTodayUsage,
} from './lib/dailyLimit';

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function loadProfile(): StudentProfile | null {
  try {
    const raw = localStorage.getItem('student_profile');
    if (!raw) return null;
    return JSON.parse(raw) as StudentProfile;
  } catch {
    return null;
  }
}

export default function App() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<ViewState>('login');
  const [mode, setMode] = useState<AppMode | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [dailyBlockInfo, setDailyBlockInfo] = useState<{
    subject: string;
    topic: string;
  } | null>(null);

  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);

  // 初始化：读取本地 profile，决定首屏
  useEffect(() => {
    const p = loadProfile();
    if (p) {
      setProfile(p);
      if (p.mustChangePassword) {
        setView('change_password');
      } else {
        setView('mode_selection');
      }
    } else {
      setView('login');
    }

    (async () => {
      try {
        const data = await fetchQuestions();
        setQuestions(data);
      } catch (err) {
        setError('无法加载题库，请检查网络连接。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const source = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return new URL(window.location.href).searchParams.get('ref') ?? undefined;
  }, []);

  const isPremium = profile?.tier === 'premium';

  const subjects = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.subject))).filter(Boolean);
  }, [questions]);

  const topicsFor = (subject: string): string[] => {
    const filtered = questions.filter((q) => q.subject === subject);
    const map = new Map<string, number>();
    filtered.forEach((q) => {
      if (!q.topic) return;
      const prev = map.get(q.topic);
      const order = q.chapterOrder ?? Number.MAX_SAFE_INTEGER;
      if (prev === undefined || order < prev) map.set(q.topic, order);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([t]) => t);
  };

  const topics = useMemo(() => {
    if (!selectedSubject) return [] as string[];
    return topicsFor(selectedSubject);
  }, [questions, selectedSubject]);

  const handleModeSelect = (selectedMode: AppMode) => {
    if (selectedMode === 'exam' && !isPremium) {
      setView('paywall');
      return;
    }
    setMode(selectedMode);
    setView('subject');
  };

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    if (mode === 'practice') {
      setView('topic');
    } else {
      startExam(subject);
    }
  };

  const startExam = (subject: string) => {
    const subjectQuestions = questions.filter((q) => q.subject === subject);
    const topicsInSubject: string[] = Array.from(
      new Set(subjectQuestions.map((q) => q.topic)),
    ).filter((t): t is string => Boolean(t));

    const targetTotal = 40;
    let examSet: Question[] = [];

    if (subjectQuestions.length <= targetTotal) {
      examSet = shuffleArray(subjectQuestions);
    } else {
      const questionsByTopic: Record<string, Question[]> = {};
      topicsInSubject.forEach((t) => {
        questionsByTopic[t] = shuffleArray(
          subjectQuestions.filter((q) => q.topic === t),
        );
      });

      const perTopic = Math.floor(targetTotal / topicsInSubject.length);
      let remaining = targetTotal;

      topicsInSubject.forEach((t) => {
        const count = Math.min(questionsByTopic[t].length, perTopic);
        examSet.push(...questionsByTopic[t].splice(0, count));
        remaining -= count;
      });

      if (remaining > 0) {
        const allRemaining = shuffleArray(Object.values(questionsByTopic).flat());
        examSet.push(...allRemaining.slice(0, remaining));
      }

      examSet = shuffleArray(examSet);
    }

    setQuizQuestions(examSet);
    initQuiz();
  };

  const handleTopicSelect = (topic: string) => {
    if (!profile || !selectedSubject) return;

    // 免费用户：检查每日限额
    if (!isPremium) {
      const check = canStartTopic(profile.phone, selectedSubject, topic);
      if (check.ok === false) {
        setDailyBlockInfo({
          subject: check.usedSubject,
          topic: check.usedTopic,
        });
        return;
      }
    }

    setSelectedTopic(topic);
    const topicQuestions = questions.filter(
      (q) => q.subject === selectedSubject && q.topic === topic,
    );
    setQuizQuestions(shuffleArray(topicQuestions));

    // 记录今日章节（仅 practice 模式、免费用户）
    if (!isPremium) {
      setTodayUsage(profile.phone, selectedSubject, topic);
    }

    initQuiz();
  };

  const initQuiz = () => {
    setCurrentIndex(0);
    setScore(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setView('quiz');
  };

  const handleAnswerSelect = (option: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);
    const currentQuestion = quizQuestions[currentIndex];
    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 1);
    }
    const newAnswers = [...answers];
    newAnswers[currentIndex] = option;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setView('result');
    }
  };

  const resetApp = () => {
    setView('mode_selection');
    setMode(null);
    setSelectedSubject(null);
    setSelectedTopic(null);
    setQuizQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const handleBack = () => {
    if (view === 'paywall') setView(mode ? 'subject' : 'mode_selection');
    else if (view === 'change_password') setView('mode_selection');
    else if (view === 'subject') setView('mode_selection');
    else if (view === 'topic') setView('subject');
    else if (view === 'quiz') {
      if (mode === 'practice') setView('topic');
      else setView('subject');
    } else if (view === 'result') setView('mode_selection');
    else if (view === 'profile') setView('mode_selection');
  };

  const handleLogout = () => {
    if (!confirm('确定要登出账号？')) return;
    localStorage.removeItem('student_profile');
    setProfile(null);
    setView('login');
  };

  const refreshTier = async () => {
    if (!profile) return;
    const updated = await queryAccount(profile.phone);
    if (updated) {
      localStorage.setItem('student_profile', JSON.stringify(updated));
      setProfile(updated);
    }
  };

  // --- Render ---

  // 未登录
  if (!profile && (view === 'login' || view === 'register')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 text-slate-800 font-sans">
        <main className="max-w-md mx-auto px-4 py-8 pb-[env(safe-area-inset-bottom)]">
          {view === 'login' ? (
            <LoginView
              onSuccess={(p) => {
                setProfile(p);
                if (p.mustChangePassword) setView('change_password');
                else setView('mode_selection');
              }}
              onGoRegister={() => setView('register')}
            />
          ) : (
            <RegisterView
              source={source}
              onGoLogin={() => setView('login')}
              onDone={(p) => {
                setProfile(p);
                setView('change_password'); // 新注册立即强制改密码
              }}
            />
          )}
        </main>
      </div>
    );
  }

  // 强制改密码
  if (profile && view === 'change_password') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-amber-50 text-slate-800 font-sans">
        <main className="max-w-md mx-auto px-4 py-8 pb-[env(safe-area-inset-bottom)]">
          <ChangePasswordView
            profile={profile}
            forced={profile.mustChangePassword}
            onDone={(p) => {
              setProfile(p);
              setView('mode_selection');
            }}
            onCancel={
              profile.mustChangePassword ? undefined : () => setView('profile')
            }
            onLogout={() => {
              localStorage.removeItem('student_profile');
              setProfile(null);
              setView('login');
            }}
          />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">正在加载题库...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">出错了</h1>
        <p className="text-slate-600 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  const todayUsage = profile ? getTodayUsage(profile.phone) : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {view !== 'mode_selection' && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0"
                aria-label="返回"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
              宽中入学试刷题宝
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPremium ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                <Crown className="w-3 h-3" /> 付费版
              </span>
            ) : (
              <button
                onClick={() => setView('paywall')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 rounded-full text-xs font-bold transition"
              >
                免费版 · 升级
              </button>
            )}
            <button
              onClick={() => setView('profile')}
              className="p-1.5 hover:bg-slate-100 rounded-full transition"
              aria-label="账号"
            >
              <UserCircle2 className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <AnimatePresence mode="wait">
          {view === 'mode_selection' && profile && (
            <motion.div
              key="mode_selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-slate-800">
                  你好，{profile.name} 👋
                </h2>
                <p className="text-slate-500">
                  {profile.school} · 请选择学习模式
                </p>
              </div>

              {!isPremium && todayUsage && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                  <CalendarClock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 leading-relaxed">
                    <p className="font-semibold">今日已选章节</p>
                    <p className="text-blue-700">
                      {todayUsage.subject} · {todayUsage.topic}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      免费版每天只能做 1 个章节，继续练同章无限次。
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => handleModeSelect('practice')}
                  className="group p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-400 transition-all text-left flex items-center gap-4 sm:gap-6"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                    <BookOpen className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                      刷题练习
                    </h3>
                    <p className="text-slate-500 text-sm">
                      按科目和章节针对性练习，题目随机打乱。
                    </p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                </button>

                <button
                  onClick={() => handleModeSelect('exam')}
                  className="group relative p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all text-left flex items-center gap-4 sm:gap-6"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                    <ClipboardList className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                      模拟考卷
                      {!isPremium && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" /> 付费版
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      全科目随机抽取 40 题，模拟真实考试环境。
                    </p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              </div>

              {!isPremium && (
                <button
                  onClick={() => setView('paywall')}
                  className="w-full p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-center gap-3 hover:shadow-md transition"
                >
                  <Crown className="w-6 h-6 text-amber-600 shrink-0" />
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-bold text-amber-900">升级付费版</p>
                    <p className="text-xs text-amber-700">
                      解锁每日无限刷题 + 模拟考卷
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-600 shrink-0" />
                </button>
              )}

              <BrandBanner variant="home" />
            </motion.div>
          )}

          {view === 'subject' && (
            <motion.div
              key="subject"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
                  {mode === 'practice' ? (
                    <BookOpen className="w-3 h-3" />
                  ) : (
                    <ClipboardList className="w-3 h-3" />
                  )}
                  {mode === 'practice' ? '刷题练习' : '模拟考卷'}
                </div>
                <h2 className="text-2xl font-bold text-slate-800">选择科目</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => handleSubjectSelect(subject)}
                    className="group relative p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <GraduationCap className="w-16 h-16" />
                    </div>
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                          Subject
                        </span>
                        <h3 className="text-xl font-bold text-slate-800">
                          {subject}
                        </h3>
                      </div>
                      <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'topic' && (
            <motion.div
              key="topic"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-800">
                  {selectedSubject}
                </h2>
                <p className="text-slate-500">请选择一个章节</p>
              </div>

              {!isPremium && todayUsage && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900">
                  💡 免费版今日只能做{' '}
                  <span className="font-bold">
                    {todayUsage.subject} · {todayUsage.topic}
                  </span>
                  ，其余章节明天再来或升级付费版。
                </div>
              )}

              <div className="space-y-3">
                {topics.map((topic) => {
                  const count = questions.filter(
                    (q) => q.subject === selectedSubject && q.topic === topic,
                  ).length;
                  const isTodayLocked =
                    !isPremium &&
                    todayUsage != null &&
                    !(
                      todayUsage.subject === selectedSubject &&
                      todayUsage.topic === topic
                    );
                  const isTodayActive =
                    !isPremium &&
                    todayUsage?.subject === selectedSubject &&
                    todayUsage?.topic === topic;

                  return (
                    <button
                      key={topic}
                      onClick={() => handleTopicSelect(topic)}
                      className={cn(
                        'w-full p-5 bg-white border rounded-xl shadow-sm flex items-center justify-between group transition-all',
                        isTodayActive
                          ? 'border-emerald-300 bg-emerald-50'
                          : isTodayLocked
                            ? 'border-slate-200 opacity-70 hover:border-amber-300 hover:bg-amber-50'
                            : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isTodayLocked && (
                          <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        {isTodayActive && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span className="font-medium text-slate-700 truncate">
                          {topic}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                          {count} 题
                        </span>
                        {isTodayLocked ? (
                          <span className="text-xs text-amber-600 font-bold">
                            明日
                          </span>
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {view === 'quiz' && quizQuestions.length > 0 && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold text-slate-600">
                      {mode === 'practice' ? '练习' : '考试'}
                    </span>
                    <span>
                      第 {currentIndex + 1} 题 / 共 {quizQuestions.length} 题
                    </span>
                  </div>
                  <span>
                    正确率:{' '}
                    {Math.round(
                      (score / (currentIndex + (selectedAnswer ? 1 : 0) || 1)) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full',
                      mode === 'practice' ? 'bg-blue-500' : 'bg-indigo-500',
                    )}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((currentIndex + 1) / quizQuestions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-xl font-bold leading-relaxed text-slate-800">
                    {quizQuestions[currentIndex].question}
                  </h3>
                  {mode === 'exam' && (
                    <span className="shrink-0 text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-1 rounded uppercase">
                      {quizQuestions[currentIndex].topic}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {['A', 'B', 'C', 'D'].map((key) => {
                    const optionText = quizQuestions[currentIndex][
                      `option${key}` as keyof Question
                    ] as string | undefined;
                    if (!optionText) return null;

                    const isSelected = selectedAnswer === key;
                    const isCorrect =
                      quizQuestions[currentIndex].answer === key;
                    const shouldHighlightCorrect =
                      selectedAnswer !== null && isCorrect;

                    return (
                      <button
                        key={key}
                        disabled={selectedAnswer !== null}
                        onClick={() => handleAnswerSelect(key)}
                        style={{ touchAction: 'manipulation' }}
                        className={cn(
                          'p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between group',
                          !selectedAnswer &&
                            'border-slate-100 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100',
                          isSelected &&
                            isCorrect &&
                            'border-emerald-500 bg-emerald-50 text-emerald-900',
                          isSelected &&
                            !isCorrect &&
                            'border-red-500 bg-red-50 text-red-900',
                          shouldHighlightCorrect &&
                            !isSelected &&
                            'border-emerald-500 bg-emerald-50/50 text-emerald-900',
                        )}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors shrink-0',
                              !selectedAnswer &&
                                'bg-slate-100 text-slate-500 group-hover:bg-blue-500 group-hover:text-white',
                              isSelected &&
                                isCorrect &&
                                'bg-emerald-500 text-white',
                              isSelected &&
                                !isCorrect &&
                                'bg-red-500 text-white',
                              shouldHighlightCorrect &&
                                !isSelected &&
                                'bg-emerald-500 text-white',
                            )}
                          >
                            {key}
                          </span>
                          <span className="font-medium">{optionText}</span>
                        </div>
                        {isSelected && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        )}
                        {isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {selectedAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <button
                      onClick={() => setShowExplanation(!showExplanation)}
                      className="flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                      {showExplanation ? '隐藏解析' : '查看解析'}
                    </button>

                    {showExplanation && (
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-900 text-sm leading-relaxed">
                        <p className="font-bold mb-1">解析：</p>
                        {quizQuestions[currentIndex].explanation || '暂无详细解析。'}
                      </div>
                    )}

                    <button
                      onClick={handleNext}
                      className={cn(
                        'w-full py-4 text-white rounded-xl font-bold transition-all shadow-lg',
                        mode === 'practice'
                          ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-200'
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100',
                      )}
                    >
                      {currentIndex === quizQuestions.length - 1
                        ? '查看结果'
                        : '下一题'}
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-8"
            >
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                  <Trophy className="w-12 h-12 text-yellow-600" />
                </div>
                <motion.div
                  className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {mode === 'practice' ? '练习完成' : '考试结束'}
                </motion.div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-slate-800">
                  {score / quizQuestions.length >= 0.8
                    ? '太棒了！'
                    : score / quizQuestions.length >= 0.5
                      ? '继续加油！'
                      : '再接再厉！'}
                </h2>
                <p className="text-slate-500">
                  你在 {selectedSubject}{' '}
                  {mode === 'practice' ? `- ${selectedTopic}` : '模拟考'} 中表现如下
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                    得分
                  </p>
                  <p className="text-2xl font-bold text-slate-800">
                    {score} / {quizQuestions.length}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                    正确率
                  </p>
                  <p className="text-2xl font-bold text-slate-800">
                    {Math.round((score / quizQuestions.length) * 100)}%
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={resetApp}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  <RefreshCcw className="w-5 h-5" />
                  回到主页
                </button>
                <button
                  onClick={() => {
                    if (mode === 'practice') handleTopicSelect(selectedTopic!);
                    else startExam(selectedSubject!);
                  }}
                  className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  重新练习
                </button>
              </div>

              <div className="pt-4 -mx-2">
                <BrandBanner variant="result" />
              </div>
            </motion.div>
          )}

          {view === 'paywall' && profile && (
            <motion.div
              key="paywall-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PaywallView
                profile={profile}
                onUpgrade={(p) => {
                  setProfile(p);
                  setView('mode_selection');
                }}
                onClose={() => setView('mode_selection')}
              />
            </motion.div>
          )}

          {view === 'profile' && profile && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <h2 className="text-2xl font-bold text-slate-800">我的账号</h2>
              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                <Row label="姓名" value={profile.name} />
                <Row label="小学" value={profile.school} />
                <Row label="联络号码" value={profile.phone} />
                <Row
                  label="版本"
                  value={profile.tier === 'premium' ? '付费版 👑' : '免费版'}
                />
                <Row
                  label="注册时间"
                  value={new Date(profile.registeredAt).toLocaleString('zh-CN')}
                />
              </div>

              {!isPremium && (
                <button
                  onClick={() => setView('paywall')}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2"
                >
                  <Crown className="w-5 h-5" />
                  升级付费版
                </button>
              )}

              <button
                onClick={refreshTier}
                className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                刷新账号状态
              </button>

              <button
                onClick={() => setView('change_password')}
                className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                修改密码
              </button>

              <button
                onClick={handleLogout}
                className="w-full py-3 text-red-600 font-medium hover:bg-red-50 rounded-xl transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                登出账号
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 每日限额拦截弹窗 */}
      {dailyBlockInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4"
          >
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
              <CalendarClock className="w-7 h-7 text-amber-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-800">今日额度已用</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                你今天已选了{' '}
                <span className="font-bold text-slate-800">
                  {dailyBlockInfo.subject} · {dailyBlockInfo.topic}
                </span>
                。
                <br />
                免费版每天只能做 1 个章节。
                <br />
                请明天再来，或升级付费版无限刷题。
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setDailyBlockInfo(null);
                  setView('paywall');
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                升级付费版
              </button>
              <button
                onClick={() => setDailyBlockInfo(null)}
                className="w-full py-3 text-slate-500 font-medium"
              >
                我知道了
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <footer className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-xs text-slate-400">
          © 2026 宽中入学试刷题宝 · 专为六年级学生打造
        </p>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right break-all">
        {value}
      </span>
    </div>
  );
}
