import { useState, useEffect } from "react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import {
  CardShell,
  Avatar,
} from "../components/ui/icons";
import { RiStarFill, RiFileCopyLine, RiCheckLine, RiEditLine, RiDeleteBinLine } from "@remixicon/react";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || "https://167-233-118-175.sslip.io"}/api/dashboard`;
const REDIRECT_BASE = `${import.meta.env.VITE_API_BASE_URL || "https://167-233-118-175.sslip.io"}/api/redirect`;

import { apiFetch } from "../lib/apiClient";

interface Location {
  id: string;
  name: string;
  redirect_slug: string;
  gis_2gis_url: string | null;
  yandex_maps_url: string | null;
}

interface Review {
  id: string;
  client_name: string | null;
  client_phone: string;
  service_name: string | null;
  master_name: string | null;
  status: string;
  rating: number | null;
  generated_review: string | null;
  owner_feedback: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Stats {
  sent: number;
  rated: number;
  avg_rating: number;
  pending_replies: number;
  reviews_completed: number;
  negative_captured: number;
  response_rate: number;
  daily_stats: Array<{ date: string; sent: number; rated: number; avg_rating: number }>;
  location_stats: Array<{ name: string; sent: number; rated: number; avg_rating: number }>;
}

interface SettingsData {
  id: string;
  name: string;
  category: string | null;
  phone: string;
  plan: string;
  status: string;
  gis_2gis_url: string | null;
  yandex_maps_url: string | null;
  telegram_chat_id: string | null;
  crm_type: string | null;
  crm_webhook_secret: string;
  locations: Location[];
}

interface BillingData {
  plan: string;
  status: string;
  created_at: string;
  trial_ends_at: string;
  amount_due: number;
  payment_link: string;
  is_lifetime_access: boolean;
  subscription_ends_at: string | null;
  is_manually_paused: boolean;
}

export function DashboardPage({
  activeTab,
  setActiveTab,
  businessId,
  onLogout,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  businessId: string;
  onLogout?: () => void;
}) {
  // Loading & State
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviewsData, setReviewsData] = useState<{ reviews: Review[]; total_count: number } | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Reviews Tab Filters & Pagination
  const [reviewFilter, setReviewFilter] = useState<"all" | "negative">("all");
  const [reviewsOffset, setReviewsOffset] = useState(0);
  const REVIEWS_LIMIT = 10;

  // Locations Tab State
  const [newLocName, setNewLocName] = useState("");
  const [newLocSlug, setNewLocSlug] = useState("");
  const [newLocGis, setNewLocGis] = useState("");
  const [newLocYandex, setNewLocYandex] = useState("");
  const [locError, setLocError] = useState<string | null>(null);
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [locToDelete, setLocToDelete] = useState<string | null>(null);

  const [locFieldErrors, setLocFieldErrors] = useState<{ name?: string; slug?: string }>({});
  const [locTouched, setLocTouched] = useState<{ name?: boolean; slug?: boolean }>({});

  const validateLocName = (val: string) => !val.trim() ? "Обязательное поле" : "";
  const validateLocSlug = (val: string) => {
    if (!val.trim()) return "Обязательное поле";
    if (!/^[a-z0-9-_]+$/.test(val)) return "Только латинские буквы, цифры, дефис и подчеркивание";
    return "";
  };

  const handleLocBlur = (field: "name" | "slug") => {
    setLocTouched(prev => ({ ...prev, [field]: true }));
    if (field === "name") setLocFieldErrors(prev => ({ ...prev, name: validateLocName(newLocName) }));
    if (field === "slug") setLocFieldErrors(prev => ({ ...prev, slug: validateLocSlug(newLocSlug) }));
  };

  const handleLocChange = (field: "name" | "slug", val: string) => {
    if (field === "name") {
      setNewLocName(val);
      if (locTouched.name) setLocFieldErrors(prev => ({ ...prev, name: validateLocName(val) }));
    }
    if (field === "slug") {
      const formatted = val.toLowerCase().replace(/[^a-z0-9-_]/g, "");
      setNewLocSlug(formatted);
      if (locTouched.slug) setLocFieldErrors(prev => ({ ...prev, slug: validateLocSlug(formatted) }));
    }
  };

  // Settings Tab State
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    category: "",
    phone: "",
    crm_type: "",
    gis_2gis_url: "",
    yandex_maps_url: "",
    telegram_chat_id: "",
  });
  const [settingsMsg, setSettingsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [settingsFieldErrors, setSettingsFieldErrors] = useState<{ name?: string; category?: string; phone?: string }>({});
  const [settingsTouched, setSettingsTouched] = useState<{ name?: boolean; category?: boolean; phone?: boolean }>({});

  const validateSettingsField = (val: string) => !val.trim() ? "Обязательное поле" : "";

  const handleSettingsBlur = (field: "name" | "category" | "phone") => {
    setSettingsTouched(prev => ({ ...prev, [field]: true }));
    setSettingsFieldErrors(prev => ({ ...prev, [field]: validateSettingsField(settingsForm[field]) }));
  };

  const handleSettingsChange = (field: keyof typeof settingsForm, val: string) => {
    setSettingsForm(prev => ({ ...prev, [field]: val }));
    if (settingsTouched[field as "name" | "category" | "phone"]) {
      setSettingsFieldErrors(prev => ({ ...prev, [field as "name" | "category" | "phone"]: validateSettingsField(val) }));
    }
  };

  // Fetch functions
  const fetchStats = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/${businessId}/stats`);
      if (!res.ok) throw new Error("Не удалось загрузить статистику");
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchReviews = async (offset = 0, isNegative = false) => {
    try {
      let url = `${API_BASE}/${businessId}/reviews?limit=${REVIEWS_LIMIT}&offset=${offset}`;
      if (isNegative) {
        url += "&rating_lte=3";
      }
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Не удалось загрузить отзывы");
      const data = await res.json();
      setReviewsData(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/${businessId}/settings`);
      if (!res.ok) throw new Error("Не удалось загрузить настройки");
      const data = await res.json();
      setSettings(data);
      setSettingsForm({
        name: data.name || "",
        category: data.category || "",
        phone: data.phone || "",
        crm_type: data.crm_type || "",
        gis_2gis_url: data.gis_2gis_url || "",
        yandex_maps_url: data.yandex_maps_url || "",
        telegram_chat_id: data.telegram_chat_id || "",
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchBilling = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/${businessId}/billing`);
      if (!res.ok) throw new Error("Не удалось загрузить биллинг");
      const data = await res.json();
      setBilling(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Re-fetch data on activeTab or businessId change
  useEffect(() => {
    setLoading(true);
    setError(null);
    const loadData = async () => {
      if (activeTab === "overview") {
        await fetchStats();
        await fetchReviews(0, false);
      } else if (activeTab === "reviews") {
        setReviewsOffset(0);
        await fetchReviews(0, reviewFilter === "negative");
      } else if (activeTab === "locations" || activeTab === "settings") {
        await fetchSettings();
      } else if (activeTab === "billing") {
        await fetchBilling();
      }
      setLoading(false);
    };
    loadData();
  }, [activeTab, businessId]);

  // Handle Review Filter switch
  const handleReviewFilterChange = (filter: "all" | "negative") => {
    setReviewFilter(filter);
    setReviewsOffset(0);
    fetchReviews(0, filter === "negative");
  };

  // Handle Review Pagination
  const handleReviewsPageChange = (direction: "prev" | "next") => {
    const newOffset = direction === "prev"
      ? Math.max(0, reviewsOffset - REVIEWS_LIMIT)
      : reviewsOffset + REVIEWS_LIMIT;
    setReviewsOffset(newOffset);
    fetchReviews(newOffset, reviewFilter === "negative");
  };

  // Create or Update Location
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocError(null);
    try {
      if (editingLocId) {
        // Update
        const res = await apiFetch(`${API_BASE}/${businessId}/locations/${editingLocId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newLocName,
            gis_2gis_url: newLocGis || null,
            yandex_maps_url: newLocYandex || null,
          }),
        });
        if (!res.ok) throw new Error("Не удалось обновить локацию");
      } else {
        // Create
        const res = await apiFetch(`${API_BASE}/${businessId}/locations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newLocName,
            redirect_slug: newLocSlug,
            gis_2gis_url: newLocGis || null,
            yandex_maps_url: newLocYandex || null,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Не удалось создать локацию");
        }
      }
      // Reset & refresh
      setNewLocName("");
      setNewLocSlug("");
      setNewLocGis("");
      setNewLocYandex("");
      setEditingLocId(null);
      await fetchSettings();
    } catch (err: any) {
      setLocError(err.message);
    }
  };

  // Delete Location
  const handleDeleteLocation = (locId: string) => {
    setLocToDelete(locId);
  };

  const confirmDeleteLocation = async () => {
    if (!locToDelete) return;
    try {
      const res = await apiFetch(`${API_BASE}/${businessId}/locations/${locToDelete}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Не удалось удалить локацию");
      setLocToDelete(null);
      await fetchSettings();
    } catch (err: any) {
      setLocError(err.message);
      setLocToDelete(null);
    }
  };

  // Start Editing Location
  const handleStartEditLocation = (loc: Location) => {
    setEditingLocId(loc.id);
    setNewLocName(loc.name);
    setNewLocSlug(loc.redirect_slug);
    setNewLocGis(loc.gis_2gis_url || "");
    setNewLocYandex(loc.yandex_maps_url || "");
  };

  // Cancel Editing Location
  const handleCancelEditLocation = () => {
    setEditingLocId(null);
    setNewLocName("");
    setNewLocSlug("");
    setNewLocGis("");
    setNewLocYandex("");
  };

  // Save Settings Form
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMsg(null);
    try {
      const res = await apiFetch(`${API_BASE}/${businessId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settingsForm.name,
          category: settingsForm.category || null,
          phone: settingsForm.phone,
          crm_type: settingsForm.crm_type || null,
          gis_2gis_url: settingsForm.gis_2gis_url || null,
          yandex_maps_url: settingsForm.yandex_maps_url || null,
          telegram_chat_id: settingsForm.telegram_chat_id || null,
        }),
      });
      if (!res.ok) throw new Error("Не удалось сохранить настройки");
      setSettingsMsg({ type: "success", text: "Настройки успешно сохранены!" });
    } catch (err: any) {
      setSettingsMsg({ type: "error", text: err.message });
    }
  };

  // Render Star Utility
  const renderStars = (rating: number | null) => {
    if (rating === null) return <span className="text-slate-300">-</span>;
    return (
      <span className="text-amber-500 font-semibold">
        {"★".repeat(rating)}
        <span className="text-slate-200">{"★".repeat(5 - rating)}</span>
      </span>
    );
  };

  const handleSubscribe = async (planName: string) => {
    if (!businessId) return;
    if (confirm(`Вы будете перенаправлены на Kaspi Pay для оплаты тарифа ${planName.toUpperCase()}. Продолжить?`)) {
      try {
        const res = await apiFetch(`${API_BASE}/${businessId}/billing/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planName }),
        });
        if (res.ok) {
          alert("Оплата успешно завершена (Mock Kaspi). Тариф активирован!");
          const bRes = await apiFetch(`${API_BASE}/${businessId}/billing`);
          if (bRes.ok) setBilling(await bRes.json());
        }
      } catch (e) {
        console.error("Ошибка при оплате подписки:", e);
      }
    }
  };

  const handleTogglePause = async () => {
    if (!businessId || !billing) return;
    const newPauseState = !billing.is_manually_paused;
    const actionText = newPauseState ? "приостановить" : "возобновить";
    if (confirm(`Вы уверены, что хотите ${actionText} рассылки?`)) {
      try {
        const res = await apiFetch(`${API_BASE}/${businessId}/billing/pause`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_paused: newPauseState }),
        });
        if (res.ok) {
          const bRes = await apiFetch(`${API_BASE}/${businessId}/billing`);
          if (bRes.ok) setBilling(await bRes.json());
        }
      } catch (e) {
        console.error("Ошибка при паузе рассылок:", e);
      }
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout}>
      <div className="space-y-8">
        
        {/* Header */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand uppercase"> ReviewFlow.kz</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-main sm:text-[1.85rem]">
              {settings ? settings.name : "Панель управления"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-text-muted">ID бизнеса:</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(businessId);
                setCopiedId(true);
                setTimeout(() => setCopiedId(false), 2000);
              }}
              title="Копировать ID бизнеса"
              className="group flex items-center gap-2 rounded-full border border-border-subtle bg-white/50 dark:bg-zinc-800/50 px-4 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 hover:dark:bg-zinc-700"
            >
              <span className="truncate max-w-[120px] sm:max-w-[160px]">{businessId}</span>
              {copiedId ? (
                <RiCheckLine className="h-4 w-4 text-green-500" />
              ) : (
                <RiFileCopyLine className="h-4 w-4 text-text-muted group-hover:text-[var(--brand)] transition-colors" />
              )}
            </button>
          </div>
        </header>

        {/* Global Loading / Error */}
        {loading && (
          <div className="flex h-64 items-center justify-center rounded-3xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-soft transition-colors duration-200">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-text-muted">Загрузка данных...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-3xl bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/30 p-6 shadow-soft transition-colors">
            <h3 className="font-semibold text-lg">Произошла ошибка при загрузке</h3>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-red-100 dark:bg-red-900/40 px-4 py-2 text-xs font-semibold text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        )}

        {/* TABS CONTENT */}
        {!loading && !error && (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && stats && (
              <div className="space-y-8">
                
                {/* Overview & Metrics Layout */}
                <div className="grid gap-[var(--spacing-fluid-lg)] lg:grid-cols-[1fr_300px]">
                  {/* Left Column: Welcome & Volume */}
                  <div className="space-y-[var(--spacing-fluid-md)]">
                    <section className="rounded-card bg-[var(--surface)] shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative flex h-3 w-3 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--success)]"></span>
                        </div>
                        <h2 className="text-2xl font-bold text-text-main leading-tight">
                          Сбор отзывов активен
                        </h2>
                      </div>
                      <button
                        onClick={() => setActiveTab("settings")}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-2 text-sm font-semibold text-text-main transition-all hover:bg-slate-50 dark:hover:bg-zinc-800/50 active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                      >
                        Настроить интеграцию
                      </button>
                    </section>

                    <div className="rounded-card bg-[var(--surface)] shadow-sm flex flex-col sm:flex-row overflow-hidden">
                      <div className="flex-1 p-6 sm:p-8 border-b sm:border-b-0 sm:border-r border-[var(--border-subtle)]">
                        <p className="text-sm font-semibold text-text-muted">Отправлено запросов • WhatsApp</p>
                        <p className="mt-4 text-4xl sm:text-5xl font-black text-text-main">{stats.sent}</p>
                      </div>
                      <div className="flex-1 p-6 sm:p-8">
                        <p className="text-sm font-semibold text-text-muted">Ожидают ответа</p>
                        <p className="mt-4 text-4xl sm:text-5xl font-black text-text-main">{stats.pending_replies}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Rating Highlight */}
                  <div className="space-y-[var(--spacing-fluid-md)]">
                    <div className="rounded-card bg-[var(--surface)] p-6 sm:p-8 shadow-sm h-full flex flex-col justify-center">
                      <p className="text-sm font-semibold text-text-muted mb-6 text-center sm:text-left uppercase tracking-wider">Средняя оценка</p>
                      
                      <div className="flex items-center justify-center sm:justify-start gap-4">
                        <div className="text-[var(--brand)]">
                          <RiStarFill className="h-10 w-10 sm:h-12 sm:w-12" />
                        </div>
                        <div>
                          <p className="text-5xl font-black text-text-main leading-none">{stats.avg_rating}</p>
                          <p className="text-xs text-text-muted mt-2">На основе {stats.rated} ответов</p>
                        </div>
                      </div>
                      
                      <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
                        <div className="flex justify-between items-center text-sm mb-3">
                          <span className="text-text-muted font-medium">Конверсия</span>
                          <span className="font-bold text-text-main">{stats.response_rate}%</span>
                        </div>
                        <div className="h-3 w-full bg-[var(--dashboard-bg)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--brand)] rounded-full transition-all duration-1000" style={{ width: `${stats.response_rate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts & Locations */}
                <section className="grid gap-[var(--spacing-fluid-md)] xl:grid-cols-[1.6fr_1fr]">
                  
                  {/* Dynamic Line Chart */}
                  <div className="rounded-card bg-[var(--surface)] shadow-sm p-6 sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-text-main">Динамика отправки</h3>
                        <p className="mt-1 text-sm text-text-muted">Запросы и оценки за 7 дней</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-text-main font-medium">
                          <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand)]" />
                          Отправлено
                        </span>
                        <span className="flex items-center gap-1.5 text-text-main font-medium">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                          С оценкой
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 overflow-hidden rounded-2xl bg-[var(--dashboard-bg)] p-6">
                      {(() => {
                        const maxData = Math.max(...stats.daily_stats.map(d => Math.max(d.sent, d.rated)));
                        const isChartEmpty = maxData === 0;

                        if (isChartEmpty) {
                          return (
                            <div className="flex flex-col items-center justify-center h-48 text-center">
                              <div className="rounded-full bg-[var(--surface)] p-4 text-text-muted mb-3">
                                <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                              </div>
                              <p className="text-sm font-medium text-text-muted">Нет данных за выбранный период</p>
                            </div>
                          );
                        }

                        const width = 600;
                        const height = 200;
                        const padding = 25;
                        const chartWidth = width - padding * 2;
                        const chartHeight = height - padding * 2;

                        const maxVal = Math.max(4, Math.ceil(maxData / 4) * 4);

                        const pointsSent = stats.daily_stats.map((d, i) => {
                          const x = padding + (i * chartWidth) / (stats.daily_stats.length - 1);
                          const y = padding + chartHeight - (d.sent * chartHeight) / maxVal;
                          return `${x},${y}`;
                        }).join(" ");

                        const pointsRated = stats.daily_stats.map((d, i) => {
                          const x = padding + (i * chartWidth) / (stats.daily_stats.length - 1);
                          const y = padding + chartHeight - (d.rated * chartHeight) / maxVal;
                          return `${x},${y}`;
                        }).join(" ");

                        return (
                          <svg className="w-full h-48" viewBox={`0 0 ${width} ${height}`}>
                            {/* Grid Lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                              const y = padding + chartHeight * r;
                              const val = Math.round(maxVal * (1 - r));
                              return (
                                <g key={idx}>
                                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="4 4" />
                                  <text x={padding - 5} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{val}</text>
                                </g>
                              );
                            })}
                            
                            {/* Lines */}
                            <polyline fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeDasharray="5 5" points={pointsSent} />
                            <polyline fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pointsRated} />

                            {/* Axis Labels */}
                            {stats.daily_stats.map((d, i) => {
                              const x = padding + (i * chartWidth) / (stats.daily_stats.length - 1);
                              const dateParts = d.date.split("-");
                              const label = `${dateParts[2]}/${dateParts[1]}`;
                              return (
                                <text key={i} x={x} y={height - 5} fill="var(--text-muted)" fontSize="10" textAnchor="middle">
                                  {label}
                                </text>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Location Stats */}
                  <div className="rounded-card bg-[var(--surface)] shadow-sm p-6 sm:p-8">
                    <div>
                      <h3 className="text-lg font-bold text-text-main">Показатели по точкам</h3>
                      <p className="mt-1 text-sm text-text-muted">Активность по филиалам</p>
                    </div>

                    <div className="mt-6 space-y-4">
                      {stats.location_stats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center bg-[var(--dashboard-bg)] rounded-2xl border border-[var(--border-subtle)]">
                          <div className="rounded-full bg-[var(--surface)] p-4 text-text-muted mb-4 shadow-sm">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <p className="text-sm font-bold text-text-main">Локации пока не настроены</p>
                          <p className="mt-1 text-xs text-text-muted max-w-[200px] mx-auto leading-relaxed">Для начала сбора отзывов добавьте ваш первый филиал.</p>
                          <button
                            onClick={() => setActiveTab("settings")}
                            className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--text-main)] px-5 py-2 text-sm font-semibold text-[var(--surface)] transition-all hover:opacity-90 active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                          >
                            Добавить филиал
                          </button>
                        </div>
                      ) : (
                        stats.location_stats.map((loc) => (
                          <div key={loc.name} className="rounded-2xl border border-[var(--border-subtle)] p-4 hover:bg-[var(--dashboard-bg)] transition-colors">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-text-main">{loc.name}</p>
                              <span className="rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                                ★ {loc.avg_rating}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                              <span>Отправлено: <b className="text-text-main">{loc.sent}</b></span>
                              <span>С ответом: <b className="text-text-main">{loc.rated}</b></span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>

                {/* Recent Reviews Summary */}
                <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                  
                  {/* Reviews List */}
                  <CardShell>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-text-main">Последние отзывы</h3>
                        <p className="mt-1 text-sm text-text-muted">Недавние ответы и оценки клиентов</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("reviews")}
                        className="text-xs font-bold text-brand hover:text-brand-hover transition-colors"
                      >
                        Смотреть все
                      </button>
                    </div>

                    <ul className="mt-6 space-y-4">
                      {!reviewsData || reviewsData.reviews.length === 0 ? (
                        <p className="text-center text-xs text-text-muted py-8">Отзывов пока нет.</p>
                      ) : (
                        reviewsData.reviews.slice(0, 4).map((review) => (
                          <li
                            key={review.id}
                            className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar name={review.client_name || "К"} className="h-9 w-9 shrink-0" />
                                <div>
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{review.client_name || "Клиент"}</p>
                                  <p className="text-xs text-text-muted">{review.service_name || "Услуга не указана"}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                {renderStars(review.rating)}
                                <p className="text-[10px] text-text-muted mt-0.5">{review.client_phone}</p>
                              </div>
                            </div>

                            {review.rating !== null && review.rating <= 3 && review.owner_feedback && (
                              <div className="rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 p-3 text-xs text-orange-800 dark:text-orange-300">
                                <b>Жалоба клиента:</b> "{review.owner_feedback}"
                              </div>
                            )}

                            {review.rating !== null && review.rating >= 4 && review.generated_review && (
                              <div className="ai-glow-effect rounded-xl p-3 text-xs italic text-[var(--brand)]">
                                "{review.generated_review}"
                              </div>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  </CardShell>

                  {/* Summary Overview Card */}
                  <CardShell className="bg-gradient-to-br from-slate-900 to-slate-950 text-white border-0 shadow-lg relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-40 h-40 rounded-full bg-brand/10 blur-xl" />
                    <div>
                      <span className="rounded-full bg-brand/20 px-3 py-1 text-xs font-semibold text-brand tracking-wider uppercase">ReviewFlow.kz</span>
                      <h4 className="mt-4 text-xl font-bold tracking-tight text-white">Рейтинг защищен</h4>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                        Недовольные клиенты перенаправляются на форму обратной связи, предотвращая публикацию негативных отзывов на картах.
                      </p>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-800/80 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold text-white font-mono">{stats.reviews_completed}</p>
                        <p className="text-[10px] text-slate-300">Сгенерировано AI</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-brand font-mono">{stats.negative_captured}</p>
                        <p className="text-[10px] text-slate-300">Перехвачено жалоб</p>
                      </div>
                    </div>
                  </CardShell>
                </section>
              </div>
            )}

            {/* REVIEWS HISTORY TAB */}
            {activeTab === "reviews" && reviewsData && (
              <CardShell>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-text-main">История сбора отзывов</h3>
                    <p className="mt-1 text-sm text-text-muted">Все диалоги и оценки по вашему бизнесу</p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-zinc-800 p-1">
                    <button
                      onClick={() => handleReviewFilterChange("all")}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                        reviewFilter === "all" ? "bg-surface text-text-main dark:text-slate-100 shadow-sm" : "text-text-muted hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Все отзывы
                    </button>
                    <button
                      onClick={() => handleReviewFilterChange("negative")}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                        reviewFilter === "negative" ? "bg-surface text-text-main dark:text-slate-100 shadow-sm" : "text-text-muted hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Негативные (1-3★)
                    </button>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-text-muted">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-text-muted">
                        <th className="py-4 pl-4">Клиент</th>
                        <th className="py-4">Детали услуги</th>
                        <th className="py-4">Оценка</th>
                        <th className="py-4">Статус</th>
                        <th className="py-4">Результат</th>
                        <th className="py-4 pr-4 text-right">Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewsData.reviews.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs text-text-muted">
                            Подходящие отзывы не найдены.
                          </td>
                        </tr>
                      ) : (
                        reviewsData.reviews.map((review) => (
                          <tr key={review.id} className="border-b border-[var(--border-subtle)] hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer">
                            <td className="py-4 pl-4 font-semibold text-text-main">
                              <div>{review.client_name || "Без имени"}</div>
                              <div className="text-xs text-text-muted font-mono mt-0.5">{review.client_phone}</div>
                            </td>
                            <td className="py-4">
                              <div className="text-slate-700 dark:text-slate-200 font-medium">{review.service_name || "Не указана"}</div>
                              <div className="text-xs text-text-muted">Мастер: {review.master_name || "Не указан"}</div>
                            </td>
                            <td className="py-4 font-medium">{renderStars(review.rating)}</td>
                            <td className="py-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                review.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                                review.status === "sent" ? "bg-blue-50 text-blue-700" :
                                review.status === "awaiting_feedback" ? "bg-orange-50 text-orange-700" :
                                "bg-slate-100 text-slate-600"
                              }`}>
                                {review.status === "completed" ? "Завершен" :
                                 review.status === "sent" ? "Отправлен" :
                                 review.status === "awaiting_feedback" ? "Ждем фидбек" :
                                 review.status}
                              </span>
                            </td>
                            <td className="py-4 max-w-xs">
                              {review.rating !== null && review.rating <= 3 && review.owner_feedback ? (
                                <div className="text-xs text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-xl p-2.5">
                                  <b>Жалоба:</b> "{review.owner_feedback}"
                                </div>
                              ) : review.generated_review ? (
                                <div className="ai-glow-effect rounded-xl p-2.5 text-xs italic text-[var(--brand)] max-h-20 overflow-y-auto">
                                  "{review.generated_review}"
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-4 pr-4 text-right text-xs text-text-muted font-medium">
                              {new Date(review.created_at).toLocaleDateString("ru-RU")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                  <span className="text-text-muted font-medium">
                    Показано <b>{reviewsOffset + 1}-{Math.min(reviewsOffset + REVIEWS_LIMIT, reviewsData.total_count)}</b> из <b>{reviewsData.total_count}</b>
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReviewsPageChange("prev")}
                      disabled={reviewsOffset === 0}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                      Назад
                    </button>
                    <button
                      onClick={() => handleReviewsPageChange("next")}
                      disabled={reviewsOffset + REVIEWS_LIMIT >= reviewsData.total_count}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                      Вперед
                    </button>
                  </div>
                </div>
              </CardShell>
            )}

            {/* LOCATIONS TAB */}
            {activeTab === "locations" && settings && (
              <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                
                {/* Locations list */}
                <CardShell>
                  <div>
                    <h3 className="text-lg font-semibold text-text-main">Управление филиалами</h3>
                    <p className="mt-1 text-sm text-text-muted">Настройка ссылок на карты и слагов перенаправления для каждой точки</p>
                  </div>

                  <div className="mt-6 space-y-4">
                    {settings.locations.length === 0 ? (
                      <p className="text-center text-xs text-text-muted py-12">Точки еще не добавлены. Добавьте филиал справа.</p>
                    ) : (
                      settings.locations.map((loc) => (
                        <div key={loc.id} className="rounded-2xl border border-[var(--border-subtle)] p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">{loc.name}</h4>
                            <p className="text-xs text-text-muted font-mono">
                              Редирект: <a href={`${REDIRECT_BASE}/${loc.redirect_slug}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">/go/{loc.redirect_slug}</a>
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px]">
                              <span className={loc.gis_2gis_url ? "text-emerald-600 dark:text-emerald-500" : "text-slate-300 dark:text-zinc-600"}>
                                2ГИС: {loc.gis_2gis_url ? "Подключен ✓" : "Нет"}
                              </span>
                              <span className={loc.yandex_maps_url ? "text-emerald-600 dark:text-emerald-500" : "text-slate-300 dark:text-zinc-600"}>
                                Яндекс: {loc.yandex_maps_url ? "Подключен ✓" : "Нет"}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleStartEditLocation(loc)}
                              title="Редактировать"
                              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-slate-100 hover:text-[var(--brand)] dark:hover:bg-zinc-800 transition-colors active:scale-95 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                            >
                              <RiEditLine className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLocation(loc.id)}
                              title="Удалить"
                              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-red-50 hover:text-error dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors active:scale-95 focus:ring-2 focus:ring-red-500 focus:outline-none"
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardShell>

                {/* Add/Edit Location form */}
                <CardShell>
                  <div>
                    <h3 className="text-lg font-semibold text-text-main">
                      {editingLocId ? "Редактировать локацию" : "Добавить новый филиал"}
                    </h3>
                    <p className="mt-1 text-sm text-text-muted">
                      {editingLocId ? "Изменение ссылок для выбранной точки" : "Создание новой точки с уникальным слагом редиректа"}
                    </p>
                  </div>

                  <form onSubmit={handleSaveLocation} className="mt-6 space-y-4">
                    {locError && (
                      <div className="rounded-xl bg-red-50 p-4 text-xs text-red-800">{locError}</div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-muted uppercase">Название филиала *</label>
                      <input
                        type="text"
                        required
                        value={newLocName}
                        onChange={(e) => handleLocChange("name", e.target.value)}
                        onBlur={() => handleLocBlur("name")}
                        placeholder="Например, Dostyk Ave"
                        className={`w-full rounded-2xl border bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors ${locFieldErrors.name ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-border-subtle focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                      />
                      {locFieldErrors.name && <p className="mt-1 text-xs text-error animate-fade-in">{locFieldErrors.name}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-muted uppercase">Слаг для редиректа *</label>
                      <input
                        type="text"
                        required
                        disabled={editingLocId !== null}
                        value={newLocSlug}
                        onChange={(e) => handleLocChange("slug", e.target.value)}
                        onBlur={() => handleLocBlur("slug")}
                        placeholder="Например, dostyk"
                        className={`w-full rounded-2xl border bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none disabled:bg-slate-50 disabled:dark:bg-zinc-900/50 disabled:text-text-muted disabled:dark:text-zinc-500 transition-colors ${locFieldErrors.slug ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-border-subtle focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                      />
                      {locFieldErrors.slug && <p className="mt-1 text-xs text-error animate-fade-in">{locFieldErrors.slug}</p>}
                      {!editingLocId && !locFieldErrors.slug && (
                        <p className="text-[10px] text-text-muted">Будет создана ссылка: <b>{REDIRECT_BASE}/{newLocSlug || "слаг"}</b></p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-muted uppercase">Ссылка 2ГИС (опционально)</label>
                      <input
                        type="url"
                        value={newLocGis}
                        onChange={(e) => setNewLocGis(e.target.value)}
                        placeholder="Ссылка на филиал в 2ГИС"
                        className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-muted uppercase">Ссылка Яндекс.Карты (опционально)</label>
                      <input
                        type="url"
                        value={newLocYandex}
                        onChange={(e) => setNewLocYandex(e.target.value)}
                        placeholder="Ссылка на филиал в Яндекс.Картах"
                        className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 rounded-full bg-brand hover:bg-brand-hover py-3 text-sm font-semibold text-white transition-colors shadow-sm active:scale-95 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingLocId ? "Сохранить изменения" : "Создать локацию"}
                      </button>
                      {editingLocId && (
                        <button
                          type="button"
                          onClick={handleCancelEditLocation}
                          className="rounded-full bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-800 border border-border-subtle px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors active:scale-95 focus:ring-2 focus:ring-slate-300 dark:focus:ring-zinc-600 focus:outline-none"
                        >
                          Отмена
                        </button>
                      )}
                    </div>
                  </form>
                </CardShell>
              </div>
            )}

            {/* SETTINGS (ONBOARDING) TAB */}
            {activeTab === "settings" && settings && (
              <CardShell className="max-w-3xl mx-auto">
                <div>
                  <h3 className="text-lg font-semibold text-text-main">Настройки бизнеса и интеграций</h3>
                  <p className="mt-1 text-sm text-text-muted">Настройте общие параметры бизнеса, ключи подключения CRM и оповещения</p>
                </div>

                <form onSubmit={handleSaveSettings} className="mt-8 space-y-6">
                  {settingsMsg && (
                    <div className={`rounded-xl p-4 text-xs font-semibold ${
                      settingsMsg.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                    }`}>
                      {settingsMsg.text}
                    </div>
                  )}

                  {/* Section 1: Business Profile */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-brand uppercase tracking-wider">Профиль бизнеса</h4>
                    
                    <div className="grid gap-[var(--spacing-fluid-md)] grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-muted uppercase">Название бизнеса *</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.name}
                          onChange={(e) => handleSettingsChange("name", e.target.value)}
                          onBlur={() => handleSettingsBlur("name")}
                          className={`w-full rounded-2xl border bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors ${settingsFieldErrors.name ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-border-subtle focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                        />
                        {settingsFieldErrors.name && <p className="mt-1 text-xs text-error animate-fade-in">{settingsFieldErrors.name}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-muted uppercase">Категория / Сфера *</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.category}
                          onChange={(e) => handleSettingsChange("category", e.target.value)}
                          onBlur={() => handleSettingsBlur("category")}
                          placeholder="Например, Салон красоты"
                          className={`w-full rounded-2xl border bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors ${settingsFieldErrors.category ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-border-subtle focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                        />
                        {settingsFieldErrors.category && <p className="mt-1 text-xs text-error animate-fade-in">{settingsFieldErrors.category}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-muted uppercase">Контактный телефон *</label>
                      <input
                        type="tel"
                        required
                        value={settingsForm.phone}
                        onChange={(e) => handleSettingsChange("phone", e.target.value)}
                        onBlur={() => handleSettingsBlur("phone")}
                        className={`w-full rounded-2xl border bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors ${settingsFieldErrors.phone ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-border-subtle focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                      />
                      {settingsFieldErrors.phone && <p className="mt-1 text-xs text-error animate-fade-in">{settingsFieldErrors.phone}</p>}
                    </div>
                  </div>

                  {/* Section 2: CRM & Webhooks */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-brand uppercase tracking-wider">Интеграция CRM</h4>
                    
                    <div className="grid gap-[var(--spacing-fluid-md)] grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-muted uppercase">Тип CRM</label>
                        <select
                          value={settingsForm.crm_type}
                          onChange={(e) => setSettingsForm({ ...settingsForm, crm_type: e.target.value })}
                          className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                        >
                          <option value="">Без интеграции (вручную)</option>
                          <option value="yclients">YClients</option>
                          <option value="amocrm">amoCRM</option>
                          <option value="bitrix24">Битрикс24</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-muted uppercase">Секрет Вебхука (только чтение)</label>
                        <input
                          type="text"
                          readOnly
                          value={settings.crm_webhook_secret}
                          className="w-full rounded-2xl border border-border-subtle bg-dashboard-bg px-4 py-3 text-sm font-mono text-text-muted focus:outline-none"
                        />
                        <p className="text-[10px] text-text-muted">Используйте этот секрет для проверки входящих событий</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Default Map URLs & Alerts */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-brand uppercase tracking-wider">Глобальные ссылки и оповещения</h4>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-muted uppercase">Дефолтная ссылка 2ГИС</label>
                      <input
                        type="url"
                        value={settingsForm.gis_2gis_url}
                        onChange={(e) => setSettingsForm({ ...settingsForm, gis_2gis_url: e.target.value })}
                        placeholder="Будет использоваться, если у филиала нет индивидуальной ссылки"
                        className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-muted uppercase">Дефолтная ссылка Яндекс.Карты</label>
                      <input
                        type="url"
                        value={settingsForm.yandex_maps_url}
                        onChange={(e) => setSettingsForm({ ...settingsForm, yandex_maps_url: e.target.value })}
                        placeholder="Будет использоваться, если у филиала нет индивидуальной ссылки"
                        className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-muted uppercase">Telegram Chat ID (Оповещения о негативе)</label>
                      <input
                        type="text"
                        value={settingsForm.telegram_chat_id}
                        onChange={(e) => setSettingsForm({ ...settingsForm, telegram_chat_id: e.target.value.trim() })}
                        placeholder="Chat ID вашего Telegram бота для алертов об оценках 1-3"
                        className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                      />
                      <p className="text-[10px] text-text-muted">На этот чат будут приходить уведомления о перехваченном негативе</p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full rounded-full bg-brand hover:bg-brand-hover py-3.5 text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-[0.98] focus:ring-2 focus:ring-[var(--brand)] focus:outline-none focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Сохранить настройки
                    </button>
                  </div>
                </form>
              </CardShell>
            )}

            {/* BILLING TAB */}
            {activeTab === "billing" && billing && (
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Subscription Details Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-text-main">Управление подпиской</h3>
                    <p className="mt-1 text-sm text-text-muted">
                      {billing.is_lifetime_access 
                        ? "Вам предоставлен вечный доступ. Рассылки никогда не будут заблокированы."
                        : "Управляйте тарифами, платежами и статусом рассылок"}
                    </p>
                  </div>
                  {billing.is_lifetime_access && (
                    <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-600/20">
                      Вечный доступ (Lifetime)
                    </span>
                  )}
                </div>

                <div className="grid gap-[var(--spacing-fluid-md)] grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                  {/* START Plan */}
                  <div className={`relative rounded-3xl p-6 border ${billing.plan === "light" ? "border-brand bg-brand/5 shadow-md" : "border-border-subtle bg-surface"} transition-all`}>
                    {billing.plan === "light" && <div className="absolute top-0 right-0 rounded-bl-xl rounded-tr-3xl bg-brand px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">Текущий</div>}
                    <h4 className="text-lg font-bold text-text-main">Start</h4>
                    <p className="mt-1 text-xs text-text-muted min-h-[40px]">Базовые возможности для начала</p>
                    <div className="my-4 text-2xl font-extrabold text-text-main">10 000 ₸<span className="text-sm font-normal text-text-muted">/мес</span></div>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-text-muted mb-6">
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Обычная рассылка сообщений</li>
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Перехват негатива в Telegram</li>
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Маршрутизация на 2GIS/Yandex</li>
                    </ul>
                    <button onClick={() => handleSubscribe("light")} className={`w-full rounded-full py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${billing.plan === "light" ? "opacity-50 cursor-not-allowed bg-slate-100 text-text-muted dark:bg-zinc-800/50 dark:text-zinc-500 border border-transparent" : "bg-transparent border border-border-subtle text-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-[0.96] focus:ring-slate-300 dark:focus:ring-zinc-600"}`} disabled={billing.plan === "light"}>
                      {billing.plan === "light" ? "Активен" : "Выбрать Start"}
                    </button>
                  </div>

                  {/* PRO Plan */}
                  <div className={`relative rounded-3xl p-6 border ${billing.plan === "standard" ? "border-brand bg-brand/5 shadow-md transform scale-105" : "border-border-subtle bg-surface"} transition-all`}>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">Популярный</div>
                    {billing.plan === "standard" && <div className="absolute top-0 right-0 rounded-bl-xl rounded-tr-3xl bg-brand px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">Текущий</div>}
                    <h4 className="text-lg font-bold text-text-main">Pro</h4>
                    <p className="mt-1 text-xs text-text-muted min-h-[40px]">Максимум отзывов с искусственным интеллектом</p>
                    <div className="my-4 text-2xl font-extrabold text-text-main">15 000 ₸<span className="text-sm font-normal text-text-muted">/мес</span></div>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-text-muted mb-6">
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Всё из тарифа Start</li>
                      <li className="flex gap-2 font-medium text-text-main dark:text-slate-200"><RiCheckLine className="h-5 w-5 text-orange-500 shrink-0"/> ИИ-генерация отзывов</li>
                      <li className="flex gap-2 font-medium text-text-main dark:text-slate-200"><RiCheckLine className="h-5 w-5 text-orange-500 shrink-0"/> Умный тайминг отправки</li>
                    </ul>
                    <button onClick={() => handleSubscribe("standard")} className={`w-full rounded-full py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${billing.plan === "standard" ? "opacity-50 cursor-not-allowed bg-slate-100 text-text-muted dark:bg-zinc-800/50 dark:text-zinc-500 border border-transparent" : "bg-brand text-white hover:bg-brand-hover active:scale-[0.96] shadow-md hover:shadow-lg focus:ring-[var(--brand)]/30"}`} disabled={billing.plan === "standard"}>
                      {billing.plan === "standard" ? "Активен" : "Выбрать Pro"}
                    </button>
                  </div>

                  {/* ENTERPRISE Plan */}
                  <div className={`relative rounded-3xl p-6 border ${billing.plan === "network" ? "border-brand bg-brand/5 shadow-md" : "border-border-subtle bg-surface"} transition-all`}>
                    {billing.plan === "network" && <div className="absolute top-0 right-0 rounded-bl-xl rounded-tr-3xl bg-brand px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">Текущий</div>}
                    <h4 className="text-lg font-bold text-text-main">Enterprise</h4>
                    <p className="mt-1 text-xs text-text-muted min-h-[40px]">Для сетей и крупных проектов</p>
                    <div className="my-4 text-2xl font-extrabold text-text-main">Индивидуально</div>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-text-muted mb-6">
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Всё из тарифа Pro</li>
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Несколько локаций/филиалов</li>
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Приоритетная поддержка</li>
                    </ul>
                    <button onClick={() => handleSubscribe("network")} className={`w-full rounded-full py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${billing.plan === "network" ? "opacity-50 cursor-not-allowed bg-slate-100 text-text-muted dark:bg-zinc-800/50 dark:text-zinc-500 border border-transparent" : "bg-transparent border border-border-subtle text-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-[0.96] focus:ring-slate-300 dark:focus:ring-zinc-600"}`} disabled={billing.plan === "network"}>
                      {billing.plan === "network" ? "Активен" : "Связаться с нами"}
                    </button>
                  </div>
                </div>

                <CardShell className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-t-4 border-t-[var(--brand)]">
                  <div className="space-y-2">
                    <h4 className="font-bold text-text-main">Статус рассылок</h4>
                    <div className="text-sm text-slate-600 dark:text-text-muted">
                      {billing.is_manually_paused ? (
                        <span className="text-orange-600 font-medium">Приостановлены (Пауза). Новые визиты сохраняются, но сообщения не отправляются.</span>
                      ) : billing.status === "churned" && !billing.is_lifetime_access ? (
                        <span className="text-error font-medium">Приостановлены (Неоплата). Оплатите подписку для возобновления.</span>
                      ) : (
                        <span className="text-green-600 font-medium">Активны. Сообщения отправляются клиентам в штатном режиме.</span>
                      )}
                    </div>
                    {!billing.is_lifetime_access && billing.subscription_ends_at && (
                      <div className="text-xs text-text-muted">
                        Оплачено до: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(billing.subscription_ends_at).toLocaleDateString("ru-RU")}</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleTogglePause}
                    className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                      billing.is_manually_paused 
                        ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50" 
                        : "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50"
                    }`}
                  >
                    {billing.is_manually_paused ? "Возобновить рассылки" : "Приостановить рассылки"}
                  </button>
                </CardShell>

              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Location Modal */}
      {locToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-all animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--surface)] p-8 shadow-2xl border border-[var(--border-subtle)] text-center transform transition-all scale-100">
            <h2 className="text-xl font-semibold text-text-main">Удаление локации</h2>
            <p className="mt-4 text-sm text-text-muted">
              Вы уверены, что хотите безвозвратно удалить эту локацию? Это действие нельзя отменить.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setLocToDelete(null)}
                className="flex-1 rounded-full bg-slate-100 dark:bg-zinc-800 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors active:scale-95 focus:ring-2 focus:ring-slate-300 dark:focus:ring-zinc-600 focus:outline-none"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteLocation}
                className="flex-1 rounded-full bg-red-500 py-3 text-sm font-semibold text-white hover:bg-red-600 transition-colors active:scale-95 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
