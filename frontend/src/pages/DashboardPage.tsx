import { useState, useEffect } from "react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import {
  IconArrowRight,
  CardShell,
  Avatar,
} from "../components/ui/icons";

const API_BASE = "https://167-233-118-175.sslip.io/api/dashboard";

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
}

export function DashboardPage({
  activeTab,
  setActiveTab,
  businessId,
  setBusinessId,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  businessId: string;
  setBusinessId: (id: string) => void;
}) {
  // Loading & State
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviewsData, setReviewsData] = useState<{ reviews: Review[]; total_count: number } | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch functions
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/${businessId}/stats`);
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
      const res = await fetch(url);
      if (!res.ok) throw new Error("Не удалось загрузить отзывы");
      const data = await res.json();
      setReviewsData(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/${businessId}/settings`);
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
      const res = await fetch(`${API_BASE}/${businessId}/billing`);
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
        const res = await fetch(`${API_BASE}/${businessId}/locations/${editingLocId}`, {
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
        const res = await fetch(`${API_BASE}/${businessId}/locations`, {
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
  const handleDeleteLocation = async (locId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту локацию?")) return;
    try {
      const res = await fetch(`${API_BASE}/${businessId}/locations/${locId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Не удалось удалить локацию");
      await fetchSettings();
    } catch (err: any) {
      alert(err.message);
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
      const res = await fetch(`${API_BASE}/${businessId}/settings`, {
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

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="space-y-8">
        
        {/* Header */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand uppercase"> ReviewFlow.kz</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.85rem]">
              {settings?.name || "Личный кабинет мерчанта"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">ID бизнеса:</span>
            <input
              type="text"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value.trim())}
              placeholder="UUID бизнеса"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-mono text-slate-700 focus:border-brand focus:outline-none"
            />
          </div>
        </header>

        {/* Global Loading / Error */}
        {loading && (
          <div className="flex h-64 items-center justify-center rounded-3xl bg-white shadow-soft">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-slate-500">Загрузка данных...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-3xl bg-red-50 p-6 text-red-800 shadow-soft">
            <h3 className="font-semibold text-lg">Произошла ошибка при загрузке</h3>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-red-100 px-4 py-2 text-xs font-semibold text-red-800 hover:bg-red-200 transition-colors"
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
                
                {/* Hero / Overview Welcome */}
                <section className="relative overflow-hidden rounded-[2rem] bg-white p-8 shadow-[var(--shadow-card)] lg:p-10">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-purple-400 to-blue-400" />
                  <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                    <div className="max-w-xl">
                      <p className="text-sm font-semibold tracking-wide text-brand uppercase">Добро пожаловать</p>
                      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.25rem] lg:leading-[1.1]">
                        Эффективность сбора отзывов
                      </h2>
                      <p className="mt-4 max-w-lg text-sm leading-6 text-slate-500">
                        Автосбор работает стабильно. AI-модель успешно генерирует тексты отзывов для лояльных клиентов, а негативные оценки перехватываются и пересылаются вам.
                      </p>
                      <div className="mt-8 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => setActiveTab("settings")}
                          className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover shadow-md hover:shadow-lg"
                        >
                          Настройки интеграции
                          <IconArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="relative mx-auto flex h-48 w-full max-w-sm items-center justify-center rounded-[1.75rem] mesh-gradient-flow lg:h-56 shadow-lg">
                      <div className="absolute inset-6 rounded-[1.5rem] border border-white/20 bg-white/30 dark:bg-black/30 backdrop-blur-md shadow-sm" />
                      <div className="relative grid grid-cols-3 gap-6 p-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--success)] shadow-sm text-lg font-bold">★</div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-md text-lg font-bold">AI</div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--text-main)] shadow-sm text-lg font-bold">💬</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Metrics Grid */}
                <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  <CardShell>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Всего запросов</p>
                    <p className="mt-3 text-3xl font-bold font-mono text-slate-900">{stats.sent}</p>
                    <p className="mt-1 text-xs text-slate-400">Отправлено в WhatsApp</p>
                  </CardShell>
                  <CardShell>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Средняя оценка</p>
                    <p className="mt-3 text-3xl font-bold font-mono text-emerald-600">★ {stats.avg_rating}</p>
                    <p className="mt-1 text-xs text-slate-400">Оценка на основе {stats.rated} ответов</p>
                  </CardShell>
                  <CardShell>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Конверсия ответов</p>
                    <p className="mt-3 text-3xl font-bold font-mono text-brand">{stats.response_rate}%</p>
                    <p className="mt-1 text-xs text-slate-400">Процент ответивших клиентов</p>
                  </CardShell>
                  <CardShell>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ожидают ответа</p>
                    <p className="mt-3 text-3xl font-bold font-mono text-slate-900">{stats.pending_replies}</p>
                    <p className="mt-1 text-xs text-slate-400">Активные диалоги</p>
                  </CardShell>
                </section>

                {/* Charts & Locations */}
                <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                  
                  {/* Dynamic Line Chart */}
                  <CardShell>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Динамика отправки и ответов</h3>
                        <p className="mt-1 text-sm text-slate-400">Новые запросы и полученные оценки за 7 дней</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <span className="h-2 w-2 rounded-full bg-brand" />
                          Отправлено
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          С оценкой
                        </span>
                      </div>
                    </div>

                    {/* SVG Line Chart Plotter */}
                    <div className="mt-8 overflow-hidden rounded-2xl bg-slate-50 p-4">
                      {(() => {
                        const width = 600;
                        const height = 200;
                        const padding = 25;
                        const chartWidth = width - padding * 2;
                        const chartHeight = height - padding * 2;

                        const maxVal = Math.max(
                          ...stats.daily_stats.map((d) => Math.max(d.sent, d.rated, 5)),
                          5
                        );

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
                                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                                  <text x={padding - 5} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">{val}</text>
                                </g>
                              );
                            })}
                            
                            {/* Lines */}
                            <polyline fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" points={pointsSent} />
                            <polyline fill="none" stroke="#ff6b35" strokeWidth="3" strokeLinecap="round" points={pointsRated} />

                            {/* Axis Labels */}
                            {stats.daily_stats.map((d, i) => {
                              const x = padding + (i * chartWidth) / (stats.daily_stats.length - 1);
                              const dateParts = d.date.split("-");
                              const label = `${dateParts[2]}/${dateParts[1]}`;
                              return (
                                <text key={i} x={x} y={height - 5} fill="#64748b" fontSize="10" textAnchor="middle">
                                  {label}
                                </text>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                  </CardShell>

                  {/* Location Stats */}
                  <CardShell>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Показатели по точкам</h3>
                      <p className="mt-1 text-sm text-slate-400">Активность сбора отзывов по филиалам</p>
                    </div>

                    <div className="mt-6 space-y-4">
                      {stats.location_stats.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-8">Локации пока не настроены.</p>
                      ) : (
                        stats.location_stats.map((loc) => (
                          <div key={loc.name} className="rounded-2xl border border-slate-100 p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-slate-800">{loc.name}</p>
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                                ★ {loc.avg_rating}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                              <span>Отправлено: <b>{loc.sent}</b></span>
                              <span>С ответом: <b>{loc.rated}</b></span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardShell>
                </section>

                {/* Recent Reviews Summary */}
                <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                  
                  {/* Reviews List */}
                  <CardShell>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Последние отзывы</h3>
                        <p className="mt-1 text-sm text-slate-400">Недавние ответы и оценки клиентов</p>
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
                        <p className="text-center text-xs text-slate-400 py-8">Отзывов пока нет.</p>
                      ) : (
                        reviewsData.reviews.slice(0, 4).map((review) => (
                          <li
                            key={review.id}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 hover:bg-slate-50/50 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar name={review.client_name || "К"} className="h-9 w-9 shrink-0" />
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{review.client_name || "Клиент"}</p>
                                  <p className="text-xs text-slate-400">{review.service_name || "Услуга не указана"}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                {renderStars(review.rating)}
                                <p className="text-[10px] text-slate-400 mt-0.5">{review.client_phone}</p>
                              </div>
                            </div>

                            {review.rating !== null && review.rating <= 3 && review.owner_feedback && (
                              <div className="rounded-xl bg-orange-50/80 p-3 text-xs text-orange-950">
                                <b>Жалоба клиента:</b> "{review.owner_feedback}"
                              </div>
                            )}

                            {review.rating !== null && review.rating >= 4 && review.generated_review && (
                              <div className="ai-glow-effect rounded-xl p-3 text-xs italic">
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
                      <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                        Недовольные клиенты перенаправляются на форму обратной связи, предотвращая публикацию негативных отзывов на картах.
                      </p>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-800/80 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold text-white">{stats.reviews_completed}</p>
                        <p className="text-[10px] text-slate-400">Сгенерировано AI</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-brand">{stats.negative_captured}</p>
                        <p className="text-[10px] text-slate-400">Перехвачено жалоб</p>
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
                    <h3 className="text-lg font-semibold text-slate-900">История сбора отзывов</h3>
                    <p className="mt-1 text-sm text-slate-400">Все диалоги и оценки по вашему бизнесу</p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                    <button
                      onClick={() => handleReviewFilterChange("all")}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                        reviewFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Все отзывы
                    </button>
                    <button
                      onClick={() => handleReviewFilterChange("negative")}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                        reviewFilter === "negative" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Негатив (1-3★)
                    </button>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-slate-500">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                          <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                            Подходящие отзывы не найдены.
                          </td>
                        </tr>
                      ) : (
                        reviewsData.reviews.map((review) => (
                          <tr key={review.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                            <td className="py-4 pl-4 font-semibold text-slate-900">
                              <div>{review.client_name || "Без имени"}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">{review.client_phone}</div>
                            </td>
                            <td className="py-4">
                              <div className="text-slate-700 font-medium">{review.service_name || "Не указана"}</div>
                              <div className="text-xs text-slate-400">Мастер: {review.master_name || "Не указан"}</div>
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
                                <div className="text-xs text-orange-700 bg-orange-50 rounded-xl p-2.5">
                                  <b>Жалоба:</b> "{review.owner_feedback}"
                                </div>
                              ) : review.generated_review ? (
                                <div className="ai-glow-effect rounded-xl p-2.5 text-xs italic max-h-20 overflow-y-auto">
                                  "{review.generated_review}"
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-4 pr-4 text-right text-xs text-slate-400 font-medium">
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
                  <span className="text-slate-400 font-medium">
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
                    <h3 className="text-lg font-semibold text-slate-900">Управление филиалами</h3>
                    <p className="mt-1 text-sm text-slate-400">Настройка ссылок на карты и слагов перенаправления для каждой точки</p>
                  </div>

                  <div className="mt-6 space-y-4">
                    {settings.locations.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-12">Точки еще не добавлены. Добавьте филиал справа.</p>
                    ) : (
                      settings.locations.map((loc) => (
                        <div key={loc.id} className="rounded-2xl border border-slate-100 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/20 transition-colors">
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 text-base">{loc.name}</h4>
                            <p className="text-xs text-slate-400 font-mono">
                              Редирект: <a href={`https://167-233-118-175.sslip.io/api/redirect/${loc.redirect_slug}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">/go/{loc.redirect_slug}</a>
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px]">
                              <span className={loc.gis_2gis_url ? "text-emerald-600" : "text-slate-300"}>
                                2ГИС: {loc.gis_2gis_url ? "Подключен ✓" : "Нет"}
                              </span>
                              <span className={loc.yandex_maps_url ? "text-emerald-600" : "text-slate-300"}>
                                Яндекс: {loc.yandex_maps_url ? "Подключен ✓" : "Нет"}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleStartEditLocation(loc)}
                              className="rounded-full bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors"
                            >
                              Редактировать
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLocation(loc.id)}
                              className="rounded-full bg-red-50 hover:bg-red-100 px-4 py-2 text-xs font-semibold text-red-600 transition-colors"
                            >
                              Удалить
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
                    <h3 className="text-lg font-semibold text-slate-900">
                      {editingLocId ? "Редактировать локацию" : "Добавить новый филиал"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {editingLocId ? "Изменение ссылок для выбранной точки" : "Создание новой точки с уникальным слагом редиректа"}
                    </p>
                  </div>

                  <form onSubmit={handleSaveLocation} className="mt-6 space-y-4">
                    {locError && (
                      <div className="rounded-xl bg-red-50 p-4 text-xs text-red-800">{locError}</div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Название филиала *</label>
                      <input
                        type="text"
                        required
                        value={newLocName}
                        onChange={(e) => setNewLocName(e.target.value)}
                        placeholder="Например, Dostyk Ave"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Слаг для редиректа *</label>
                      <input
                        type="text"
                        required
                        disabled={editingLocId !== null}
                        value={newLocSlug}
                        onChange={(e) => setNewLocSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                        placeholder="Например, dostyk"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 transition-colors"
                      />
                      {!editingLocId && (
                        <p className="text-[10px] text-slate-400">Будет создана ссылка: <b>https://167-233-118-175.sslip.io/api/redirect/{newLocSlug || "слаг"}</b></p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Ссылка 2ГИС (опционально)</label>
                      <input
                        type="url"
                        value={newLocGis}
                        onChange={(e) => setNewLocGis(e.target.value)}
                        placeholder="Ссылка на филиал в 2ГИС"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Ссылка Яндекс.Карты (опционально)</label>
                      <input
                        type="url"
                        value={newLocYandex}
                        onChange={(e) => setNewLocYandex(e.target.value)}
                        placeholder="Ссылка на филиал в Яндекс.Картах"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 rounded-full bg-brand hover:bg-brand-hover py-3 text-sm font-semibold text-white transition-colors shadow-sm"
                      >
                        {editingLocId ? "Сохранить изменения" : "Создать локацию"}
                      </button>
                      {editingLocId && (
                        <button
                          type="button"
                          onClick={handleCancelEditLocation}
                          className="rounded-full bg-slate-100 hover:bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors"
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
                  <h3 className="text-lg font-semibold text-slate-900">Настройки бизнеса и интеграций</h3>
                  <p className="mt-1 text-sm text-slate-400">Настройте общие параметры бизнеса, ключи подключения CRM и оповещения</p>
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
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Название бизнеса *</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.name}
                          onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Категория / Сфера *</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.category}
                          onChange={(e) => setSettingsForm({ ...settingsForm, category: e.target.value })}
                          placeholder="Например, Салон красоты"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Контактный телефон *</label>
                      <input
                        type="tel"
                        required
                        value={settingsForm.phone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Section 2: CRM & Webhooks */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-brand uppercase tracking-wider">Интеграция CRM</h4>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Тип CRM</label>
                        <select
                          value={settingsForm.crm_type}
                          onChange={(e) => setSettingsForm({ ...settingsForm, crm_type: e.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none transition-colors"
                        >
                          <option value="">Без интеграции (вручную)</option>
                          <option value="yclients">YClients</option>
                          <option value="amocrm">amoCRM</option>
                          <option value="bitrix24">Битрикс24</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Секрет Вебхука (только чтение)</label>
                        <input
                          type="text"
                          readOnly
                          value={settings.crm_webhook_secret}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-500 focus:outline-none"
                        />
                        <p className="text-[10px] text-slate-400">Используйте этот секрет для проверки входящих событий</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Default Map URLs & Alerts */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-brand uppercase tracking-wider">Глобальные ссылки и оповещения</h4>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Дефолтная ссылка 2ГИС</label>
                      <input
                        type="url"
                        value={settingsForm.gis_2gis_url}
                        onChange={(e) => setSettingsForm({ ...settingsForm, gis_2gis_url: e.target.value })}
                        placeholder="Будет использоваться, если у филиала нет индивидуальной ссылки"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Дефолтная ссылка Яндекс.Карты</label>
                      <input
                        type="url"
                        value={settingsForm.yandex_maps_url}
                        onChange={(e) => setSettingsForm({ ...settingsForm, yandex_maps_url: e.target.value })}
                        placeholder="Будет использоваться, если у филиала нет индивидуальной ссылки"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Telegram Chat ID (Оповещения о негативе)</label>
                      <input
                        type="text"
                        value={settingsForm.telegram_chat_id}
                        onChange={(e) => setSettingsForm({ ...settingsForm, telegram_chat_id: e.target.value.trim() })}
                        placeholder="Chat ID вашего Telegram бота для алертов об оценках 1-3"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none transition-colors"
                      />
                      <p className="text-[10px] text-slate-400">На этот чат будут приходить уведомления о перехваченном негативе</p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full rounded-full bg-brand hover:bg-brand-hover py-3.5 text-sm font-semibold text-white transition-colors shadow-md hover:shadow-lg"
                    >
                      Сохранить настройки
                    </button>
                  </div>
                </form>
              </CardShell>
            )}

            {/* BILLING TAB */}
            {activeTab === "billing" && billing && (
              <div className="max-w-2xl mx-auto space-y-6">
                
                {/* Subscription Details Card */}
                <CardShell>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Управление подпиской</h3>
                    <p className="mt-1 text-sm text-slate-400">Сведения о вашем тарифном плане и платежах</p>
                  </div>

                  <div className="mt-8 grid gap-6 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-5 space-y-1">
                      <p className="text-xs text-slate-400 font-semibold uppercase">Тарифный план</p>
                      <p className="text-2xl font-extrabold text-slate-900 uppercase">{billing.plan}</p>
                      <p className="text-[10px] text-slate-400 pt-1">
                        {billing.plan === "light" ? "До 150 рассылок в месяц" :
                         billing.plan === "standard" ? "До 500 рассылок в месяц + AI" :
                         "Безлимитный тариф для сетей"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-5 space-y-1">
                      <p className="text-xs text-slate-400 font-semibold uppercase">Статус подписки</p>
                      <p className="text-2xl font-extrabold text-brand uppercase">{billing.status}</p>
                      <p className="text-[10px] text-slate-400 pt-1">
                        {billing.status === "trial" ? "Действует пробный период" :
                         billing.status === "active" ? "Подписка оплачена ✓" :
                         "Рассылки временно приостановлены"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-6 space-y-4 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Дата подключения:</span>
                      <span className="font-bold text-slate-800">
                        {new Date(billing.created_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Пробный период действует до:</span>
                      <span className="font-bold text-slate-800">
                        {new Date(billing.trial_ends_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-50 pt-4 text-base font-bold">
                      <span className="text-slate-800">К оплате за следующий месяц:</span>
                      <span className="text-brand">{billing.amount_due.toLocaleString()} ₸</span>
                    </div>
                  </div>
                </CardShell>

                {/* Kaspi Pay trigger card */}
                <CardShell className="bg-orange-50 border-orange-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div className="space-y-1">
                    <h4 className="font-bold text-orange-950 text-base">Быстрая оплата подписки через Kaspi Pay</h4>
                    <p className="text-xs text-orange-800">Оплачивайте подписку юридического лица мгновенно и без комиссий</p>
                  </div>

                  <a
                    href={billing.payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Мок-переход на Kaspi Pay: Выставлен счет на ${billing.amount_due} ₸ для бизнеса с ID ${businessId}`);
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-brand hover:bg-brand-hover px-6 py-3.5 text-sm font-semibold text-white transition-colors shadow-md hover:shadow-lg text-center"
                  >
                    Оплатить подписку
                  </a>
                </CardShell>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
