import { useState, useEffect } from "react";
import { RiMailLine, RiLockPasswordLine, RiUserLine, RiEyeLine, RiEyeOffLine, RiCheckLine } from "@remixicon/react";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, fullName: string) => Promise<void>;
}

export function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  // Inline Validation States
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ fullName?: boolean; email?: boolean; password?: boolean }>({});

  const validateEmail = (val: string) => {
    if (!val) return "Обязательное поле";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Кажется, в email закралась опечатка";
    return "";
  };

  const validatePassword = (val: string, isLog: boolean) => {
    if (!val) return "Обязательное поле";
    if (!isLog && val.length < 12) return "Пароль должен состоять минимум из 12 символов";
    return "";
  };

  const validateFullName = (val: string, isLog: boolean) => {
    if (!isLog && !val.trim()) return "Представьтесь, пожалуйста";
    return "";
  };

  const handleBlur = (field: "email" | "password" | "fullName") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    if (field === "password") setFieldErrors((prev) => ({ ...prev, password: validatePassword(password, isLogin) }));
    if (field === "fullName") setFieldErrors((prev) => ({ ...prev, fullName: validateFullName(fullName, isLogin) }));
  };

  const handleChange = (field: "email" | "password" | "fullName", val: string) => {
    if (field === "email") {
      setEmail(val);
      if (touched.email) setFieldErrors((prev) => ({ ...prev, email: validateEmail(val) }));
    }
    if (field === "password") {
      setPassword(val);
      if (touched.password) setFieldErrors((prev) => ({ ...prev, password: validatePassword(val, isLogin) }));
    }
    if (field === "fullName") {
      setFullName(val);
      if (touched.fullName) setFieldErrors((prev) => ({ ...prev, fullName: validateFullName(val, isLogin) }));
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("rf_session_expired") === "1") {
      setShowSessionExpired(true);
      sessionStorage.removeItem("rf_session_expired");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Run all validations on submit
    const eErr = validateEmail(email);
    const pErr = validatePassword(password, isLogin);
    const fErr = validateFullName(fullName, isLogin);

    setTouched({ email: true, password: true, fullName: !isLogin });
    setFieldErrors({ email: eErr, password: pErr, fullName: fErr });

    if (eErr || pErr || (!isLogin && fErr)) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        if (!fullName.trim()) {
          setError("Введите ваше имя");
          setLoading(false);
          return;
        }
        await onRegister(email, password, fullName);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setFieldErrors({});
    setTouched({});
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--dashboard-bg)] p-[var(--spacing-fluid-md)] transition-colors duration-200">
      {/* Animated mesh background */}
      <div className="absolute inset-0 mesh-gradient-flow opacity-20" />

      {/* Floating orbs */}
      <div className="absolute left-[10%] top-[20%] h-72 w-72 rounded-full bg-purple-500/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-[10%] right-[15%] h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute left-[50%] top-[60%] h-64 w-64 rounded-full bg-blue-500/10 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-emerald-500 text-xl font-bold text-white shadow-lg">
            RF
          </div>
          <h1 className="mt-4 text-2xl font-bold text-[var(--text-main)]">ReviewFlow.kz</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            ИИ-платформа автосбора отзывов
          </p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]/80 backdrop-blur-xl shadow-2xl transition-colors duration-200">
          {/* Tabs */}
          <div className="flex border-b border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => switchMode()}
              className={`flex-1 py-4 text-center text-sm font-semibold transition-colors ${
                isLogin
                  ? "border-b-2 border-[var(--brand)] text-[var(--brand)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => switchMode()}
              className={`flex-1 py-4 text-center text-sm font-semibold transition-colors ${
                !isLogin
                  ? "border-b-2 border-[var(--brand)] text-[var(--brand)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              Регистрация
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {/* Session expired banner */}
            {showSessionExpired && (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-600 dark:text-blue-400 text-center">
                Сессия истекла. Пожалуйста, войдите снова.
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500 text-center">
                {error}
              </div>
            )}

            {/* Full name (register only) */}
            {!isLogin && (
              <div className="group">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Полное имя
                </label>
                <div className="relative">
                  <RiUserLine className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${fieldErrors.fullName ? 'text-red-400' : 'text-[var(--text-muted)] group-focus-within:text-[var(--brand)]'}`} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    onBlur={() => handleBlur("fullName")}
                    placeholder="Артур Курбанов"
                    className={`w-full rounded-xl border bg-[var(--dashboard-bg)] py-3 pl-11 pr-4 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none transition-all ${
                      fieldErrors.fullName
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-[var(--border-subtle)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20'
                    }`}
                    autoComplete="name"
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="mt-1.5 text-xs text-red-500 animate-fade-in">{fieldErrors.fullName}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div className="group">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Email
              </label>
              <div className="relative">
                <RiMailLine className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${fieldErrors.email ? 'text-red-400' : 'text-[var(--text-muted)] group-focus-within:text-[var(--brand)]'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  placeholder="you@company.com"
                  className={`w-full rounded-xl border bg-[var(--dashboard-bg)] py-3 pl-11 pr-4 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none transition-all ${
                    fieldErrors.email
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-[var(--border-subtle)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20'
                  }`}
                  autoComplete="email"
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-red-500 animate-fade-in">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="group">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Пароль
              </label>
              <div className="relative">
                <RiLockPasswordLine className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${fieldErrors.password ? 'text-red-400' : 'text-[var(--text-muted)] group-focus-within:text-[var(--brand)]'}`} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  placeholder={isLogin ? "••••••••" : "Парольная фраза (мин. 12 символов)"}
                  className={`w-full rounded-xl border bg-[var(--dashboard-bg)] py-3 pl-11 pr-11 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none transition-all ${
                    fieldErrors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-[var(--border-subtle)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20'
                  }`}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] rounded-lg p-0.5"
                  tabIndex={-1}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <RiEyeOffLine className="h-5 w-5" /> : <RiEyeLine className="h-5 w-5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-500 animate-fade-in">{fieldErrors.password}</p>
              )}
              {!isLogin && !fieldErrors.password && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${password.length >= 12 ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-transparent'}`}>
                    <RiCheckLine className="h-3 w-3" />
                  </div>
                  <span className={`transition-colors ${password.length >= 12 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                    Минимум 12 символов (можно фразы и пробелы)
                  </span>
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[var(--brand)] to-purple-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Загрузка...</span>
                </>
              ) : isLogin ? (
                "Войти"
              ) : (
                "Создать аккаунт"
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
