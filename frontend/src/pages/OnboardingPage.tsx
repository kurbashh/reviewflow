import { useState, useEffect } from "react";
import { RiStore2Line, RiPhoneLine, RiArrowRightLine, RiCheckLine } from "@remixicon/react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface OnboardingProps {
  token: string;
  onComplete: () => void;
}

export function OnboardingPage({ token, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-advance from welcome step after 2.5 seconds
  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => setStep(2), 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      setError("Пожалуйста, заполните все поля");
      return;
    }
    
    setLoading(true);
    setError(null);
    setStep(4); // "Setting up" effect

    try {
      const res = await fetch(`${API_BASE}/api/dashboard/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, phone })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ошибка при создании профиля");
      }

      // Simulate a small delay for the Windows-like setup effect
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      setStep(3); // Возврат к форме
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[var(--dashboard-bg)] p-[var(--spacing-fluid-md)] transition-colors duration-500">
      {/* Background Mesh */}
      <div className="absolute inset-0 mesh-gradient-flow opacity-30" />
      
      {/* Floating orbs for Windows 11 style aesthetic */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-500/20 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/20 blur-[100px] animate-pulse" style={{ animationDuration: '12s' }} />

      <div className="relative z-10 w-full max-w-lg transition-all duration-700">
        
        {/* Step 1: Welcome */}
        <div className={`transition-all duration-1000 absolute top-1/2 left-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center ${step === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          <h1 className="text-5xl font-light tracking-tight text-[var(--text-main)] mb-6">Привет</h1>
          <p className="text-xl text-[var(--text-muted)] animate-pulse">Подготавливаем всё для вас...</p>
        </div>

        {/* Steps 2 & 3: Business Details */}
        <div className={`transition-all duration-1000 ${step === 2 || step === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none absolute w-full'}`}>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl dark:border-white/5 dark:bg-black/20">
            <div className="mb-8 text-center">
              <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text-main)]">Давайте настроим ваш профиль</h2>
              <p className="mt-3 text-[var(--text-muted)]">
                {step === 2 ? "Как называется ваша компания или заведение?" : "По какому номеру клиенты могут связаться с вами?"}
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-500 text-center animate-fade-in">
                {error}
              </div>
            )}

            <div className="relative overflow-hidden px-1 pb-1">
              {/* Step 2 Input */}
              <div className={`transition-transform duration-500 ${step === 2 ? 'translate-x-0' : '-translate-x-[150%] absolute w-full top-0'}`}>
                <div className="group relative">
                  <RiStore2Line className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--brand)]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(3)}
                    placeholder="Например: Салон красоты Beauty"
                    className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]/50 py-5 pl-14 pr-5 text-lg text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none backdrop-blur-sm transition-all focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/20"
                    autoFocus={step === 2}
                  />
                </div>
                <button
                  onClick={() => setStep(3)}
                  disabled={!name.trim()}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] py-4 text-lg font-semibold text-white shadow-lg shadow-[var(--brand)]/25 transition-all hover:bg-[var(--brand)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Далее <RiArrowRightLine className="h-5 w-5" />
                </button>
              </div>

              {/* Step 3 Input */}
              <div className={`transition-transform duration-500 ${step === 3 ? 'translate-x-0' : 'translate-x-[150%] absolute w-full top-0'}`}>
                <div className="group relative">
                  <RiPhoneLine className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--brand)]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && phone.trim() && handleSubmit()}
                    placeholder="+7 (777) 123-45-67"
                    className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]/50 py-5 pl-14 pr-5 text-lg text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none backdrop-blur-sm transition-all focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/20"
                    autoFocus={step === 3}
                  />
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-transparent px-6 py-4 font-semibold text-[var(--text-main)] transition-all hover:bg-[var(--surface)]"
                  >
                    Назад
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!phone.trim() || loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] py-4 text-lg font-semibold text-white shadow-lg shadow-[var(--brand)]/25 transition-all hover:bg-[var(--brand)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Завершить <RiCheckLine className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Loading / Setup effect */}
        <div className={`transition-all duration-1000 absolute top-1/2 left-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center ${step === 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          <div className="mx-auto mb-8 h-14 w-14 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-[var(--brand)]" />
          <h1 className="text-3xl font-light tracking-tight text-[var(--text-main)] mb-3">Это займёт всего пару секунд</h1>
          <p className="text-lg text-[var(--text-muted)]">Применяем настройки...</p>
        </div>

      </div>
    </div>
  );
}
