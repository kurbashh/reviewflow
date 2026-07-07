import { useState } from "react";
import { RiMailLine, RiLockPasswordLine, RiUserLine, RiEyeLine, RiEyeOffLine } from "@remixicon/react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--dashboard-bg)] p-4 transition-colors duration-200">
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
            {/* Error message */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
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
                  <RiUserLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--brand)]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Артур Курбанов"
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--dashboard-bg)] py-3 pl-11 pr-4 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none transition-all focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="group">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Email
              </label>
              <div className="relative">
                <RiMailLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--brand)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--dashboard-bg)] py-3 pl-11 pr-4 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none transition-all focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="group">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Пароль
              </label>
              <div className="relative">
                <RiLockPasswordLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--brand)]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "••••••••" : "Минимум 6 символов"}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--dashboard-bg)] py-3 pl-11 pr-11 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none transition-all focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  required
                  minLength={isLogin ? 1 : 6}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <RiEyeOffLine className="h-5 w-5" /> : <RiEyeLine className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[var(--brand)] to-purple-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading
                ? "Загрузка..."
                : isLogin
                  ? "Войти"
                  : "Создать аккаунт"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-[var(--brand)] hover:underline"
          >
            {isLogin ? "Зарегистрироваться" : "Войти"}
          </button>
        </p>
      </div>
    </div>
  );
}
