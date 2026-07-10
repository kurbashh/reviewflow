import { useState, useEffect } from "react";
import { AuthUser } from "../hooks/useAuth";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import {
  CardShell,
  Avatar,
} from "../components/ui/icons";
import { RiStarFill, RiFileCopyLine, RiCheckLine, RiEditLine, RiDeleteBinLine, RiErrorWarningFill, RiEyeLine, RiEyeOffLine, RiSparklingFill } from "@remixicon/react";

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
  is_resolved?: boolean;
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

interface MasterSummary {
  name: string;
  review_count: number;
  avg_rating: number;
  negative_count: number;
  positive_count: number;
}

interface MasterStats {
  master_name: string;
  total_rated: number;
  avg_rating: number;
  positive_count: number;
  negative_count: number;
  daily: Array<{ date: string; count: number; avg_rating: number }>;
  insight: string;
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

const renderSvgChart = (
  data: Array<{ date: string; [key: string]: any }>,
  line1Key: string,
  line2Key: string | null = null,
  line1Color: string = "var(--brand)",
  line2Color: string = "#3b82f6"
) => {
  const maxData = Math.max(...data.map(d => Math.max(Number(d[line1Key]) || 0, line2Key ? (Number(d[line2Key]) || 0) : 0)));
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

  const getPoints = (key: string) => data.map((d, i) => {
    const x = padding + (i * chartWidth) / (data.length - 1);
    const y = padding + chartHeight - ((Number(d[key]) || 0) * chartHeight) / maxVal;
    return `${x},${y}`;
  }).join(" ");

  const points1 = getPoints(line1Key);
  const points2 = line2Key ? getPoints(line2Key) : null;

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
      <polyline fill="none" stroke={line1Color} strokeWidth={line2Key ? "2.5" : "3"} strokeDasharray={line2Key ? "5 5" : "none"} strokeLinecap="round" strokeLinejoin="round" points={points1} />
      {points2 && <polyline fill="none" stroke={line2Color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points2} />}

      {/* Axis Labels */}
      {data.map((d, i) => {
        const x = padding + (i * chartWidth) / (data.length - 1);
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
};

export function DashboardPage({
  activeTab,
  setActiveTab,
  businessId,
  user,
  refreshUser,
  onLogout,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  businessId: string;
  user: AuthUser;
  refreshUser: () => void;
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

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("rf_theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("rf_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("rf_theme", "light");
    }
  }, [darkMode]);

  // Master Analytics State
  const [masters, setMasters] = useState<MasterSummary[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null);
  const [masterStats, setMasterStats] = useState<MasterStats | null>(null);
  const [loadingMasterStats, setLoadingMasterStats] = useState(false);

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
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);

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
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copiedWebhookSecret, setCopiedWebhookSecret] = useState(false);

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

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    current_password: "",
    new_password: "",
  });
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (businessId) {
      fetchStats();
      fetchBilling();
      fetchMasters();
    }
  }, [businessId]);

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        full_name: user.full_name,
        email: user.email,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (selectedMaster) {
      fetchMasterStats(selectedMaster);
    }
  }, [selectedMaster]);

  const handleProfileChange = (field: keyof typeof profileForm, val: string) => {
    setProfileForm(prev => ({ ...prev, [field]: val }));
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

  const fetchMasters = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/${businessId}/masters`);
      if (!res.ok) return; // Silent fail for masters to not block dashboard
      const data = await res.json();
      setMasters(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMasterStats = async (masterName: string) => {
    setLoadingMasterStats(true);
    setMasterStats(null);
    try {
      const res = await apiFetch(`${API_BASE}/${businessId}/masters/stats?master_name=${encodeURIComponent(masterName)}`);
      if (!res.ok) throw new Error("Ошибка при загрузке статистики мастера");
      const data = await res.json();
      setMasterStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMasterStats(false);
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
        await fetchBilling();
      } else if (activeTab === "reviews") {
        setReviewsOffset(0);
        await fetchReviews(0, reviewFilter === "negative");
      } else if (activeTab === "locations" || activeTab === "settings" || activeTab === "profile") {
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

  // Handle Review Resolution Toggle
  const handleToggleResolve = async (reviewId: string, currentStatus: boolean = false) => {
    if (!businessId) return;
    try {
      const res = await apiFetch(`${API_BASE}/${businessId}/reviews/${reviewId}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_resolved: !currentStatus }),
      });
      if (!res.ok) throw new Error("Не удалось обновить статус");
      
      setReviewsData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          reviews: prev.reviews.map(r => r.id === reviewId ? { ...r, is_resolved: !currentStatus } : r)
        };
      });
    } catch (err: any) {
      console.error(err.message);
    }
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
      setNewLocGis("");
      setNewLocYandex("");
      setEditingLocId(null);
      setIsLocModalOpen(false);
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
    setIsLocModalOpen(true);
  };

  // Cancel Editing Location
  const handleCancelEditLocation = () => {
    setEditingLocId(null);
    setNewLocName("");
    setNewLocSlug("");
    setNewLocGis("");
    setNewLocYandex("");
    setIsLocModalOpen(false);
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
    const starColor = rating <= 3 ? "text-error" : "text-amber-500";
    return (
      <span className={`${starColor} font-semibold`}>
        {"★".repeat(rating)}
        <span className="text-slate-200 dark:text-zinc-700">{"★".repeat(5 - rating)}</span>
      </span>
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      const payload: any = {};
      if (profileForm.full_name !== user?.full_name) payload.full_name = profileForm.full_name;
      if (profileForm.email !== user?.email) payload.email = profileForm.email;
      if (profileForm.new_password) payload.new_password = profileForm.new_password;
      
      if (payload.email || payload.new_password) {
        if (!profileForm.current_password) {
          throw new Error("Для смены email или пароля требуется текущий пароль");
        }
        payload.current_password = profileForm.current_password;
      }

      if (Object.keys(payload).length === 0) {
         setProfileMsg({ type: "success", text: "Нет изменений для сохранения." });
         return;
      }

      const res = await apiFetch(`${API_BASE}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Не удалось обновить профиль");
      }
      
      setProfileMsg({ type: "success", text: "Профиль успешно обновлен!" });
      setProfileForm(prev => ({ ...prev, current_password: "", new_password: "" }));
      refreshUser();
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message });
    }
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
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="space-y-8">
        
        {/* Header */}
        <header className="sticky top-0 z-30 -mx-[var(--spacing-fluid-md)] px-[var(--spacing-fluid-md)] lg:-mx-[var(--spacing-fluid-lg)] lg:px-[var(--spacing-fluid-lg)] pt-[var(--spacing-fluid-md)] lg:pt-[var(--spacing-fluid-lg)] pb-4 bg-[var(--dashboard-bg)] flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] mb-8">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand uppercase"> ReviewFlow.kz</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-main sm:text-[1.85rem]">
              {activeTab === "profile" ? "Профиль пользователя" : (user?.businesses?.[0]?.name || "Панель управления")}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--brand)] rounded-full p-1"
              title="Перейти в профиль"
            >
              <Avatar name={user?.full_name || "Пользователь"} className="h-10 w-10" />
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(businessId);
                setCopiedId(true);
                setTimeout(() => setCopiedId(false), 2000);
              }}
              title="Копировать ID бизнеса"
              className="group flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-zinc-800/60 px-3 py-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none"
            >
              ID: <span className="truncate max-w-[100px] sm:max-w-[140px] font-semibold">{businessId}</span>
              {copiedId ? (
                <RiCheckLine className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <RiFileCopyLine className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
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
                
                {/* Welcome Header */}
                <section className="rounded-card bg-[var(--surface)] shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-3 w-3 shrink-0">
                      {(!billing?.is_manually_paused && (billing?.status !== "churned" || billing?.is_lifetime_access)) ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--success)]"></span>
                        </>
                      ) : (
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-text-main leading-tight">
                      {(!billing?.is_manually_paused && (billing?.status !== "churned" || billing?.is_lifetime_access)) 
                        ? "Сбор отзывов активен" 
                        : "Сбор отзывов приостановлен"}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {billing?.is_manually_paused && (
                      <button
                        onClick={handleTogglePause}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--brand)] px-6 py-2 text-sm font-semibold text-[var(--surface)] transition-all hover:opacity-90 active:scale-[0.96]"
                      >
                        Возобновить сбор
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--border-subtle)] bg-transparent px-6 py-2 text-sm font-semibold text-text-main transition-all hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                    >
                      Настроить интеграцию
                    </button>
                  </div>
                </section>

                {/* Metrics Grid */}
                <div className="grid gap-[var(--spacing-fluid-lg)] lg:grid-cols-3">
                  
                  {/* Column 1: Risk Zone / Status */}
                  <div className="space-y-[var(--spacing-fluid-md)] h-full">
                    {masters.filter(m => m.negative_count > 0 || m.avg_rating < 4.0).length > 0 ? (
                      <div className="rounded-card bg-white dark:bg-zinc-900 shadow-sm p-6 sm:p-8 border-l-4 border-l-red-500 border-y border-r border-[var(--border-subtle)] h-full">
                        <h3 className="text-sm font-bold text-red-600 dark:text-red-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <RiErrorWarningFill className="w-5 h-5" /> Требует внимания
                        </h3>
                        <ul className="space-y-3">
                          {masters.filter(m => m.negative_count > 0 || m.avg_rating < 4.0).slice(0, 3).map(m => (
                            <li key={m.name} className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-[var(--border-subtle)] shadow-sm">
                              <div className="flex items-center gap-3">
                                <Avatar name={m.name} className="h-8 w-8 text-[10px]" />
                                <div>
                                  <p className="text-sm font-bold text-text-main">{m.name}</p>
                                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{m.negative_count > 0 ? `${m.negative_count} жалоб(ы)` : 'Низкий рейтинг'}</p>
                                </div>
                              </div>
                              <span className="flex items-center gap-1 text-sm font-bold text-text-main">
                                <RiStarFill className="w-4 h-4 text-slate-300 dark:text-zinc-600" /> 
                                <span className="text-red-600 dark:text-red-500">{m.avg_rating.toFixed(1)}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="rounded-card bg-white dark:bg-zinc-900 shadow-sm p-6 sm:p-8 border-l-4 border-l-emerald-500 border-y border-r border-[var(--border-subtle)] h-full flex flex-col items-center justify-center text-center">
                        <RiCheckLine className="w-10 h-10 text-emerald-500 mb-3" />
                        <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-1">
                          Все отлично
                        </h3>
                        <p className="text-xs text-text-muted">
                          Жалоб нет, мастера работают на 5 звезд!
                        </p>
                      </div>
                    )}
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
                  
                  {/* AI Protection Card -> Conversion Funnel (P0) */}
                  <CardShell className="bg-[var(--surface)] border border-[var(--border-subtle)] shadow-sm relative overflow-hidden flex flex-col justify-between h-full">
                    
                    <div className="relative z-10">
                      <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand tracking-wider uppercase">Воронка конверсии</span>
                      <h4 className="mt-4 text-xl font-bold tracking-tight text-text-main">Автопилот отзывов</h4>
                      <p className="mt-2 text-xs text-text-muted leading-relaxed mb-5">
                        Как наш AI превращает ваши контакты в рейтинг на картах и защищает от жалоб.
                      </p>
                      
                      <div className="flex flex-col gap-2.5">
                        {/* Step 1 */}
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-[var(--border-subtle)] relative">
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">1</div>
                            <span className="text-sm font-medium text-text-main">Отправлено запросов</span>
                          </div>
                          <span className="text-lg font-bold font-mono text-text-main">{stats.sent}</span>
                          <div className="absolute -bottom-2.5 left-6 h-2.5 w-px bg-[var(--border-subtle)]"></div>
                        </div>
                        
                        {/* Step 2 */}
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-[var(--border-subtle)] relative">
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">2</div>
                            <span className="text-sm font-medium text-text-main">Перешли по ссылке</span>
                          </div>
                          <span className="text-lg font-bold font-mono text-text-main">{stats.rated}</span>
                          <div className="absolute -bottom-2.5 left-6 h-2.5 w-px bg-[var(--border-subtle)]"></div>
                        </div>
                        
                        {/* Step 3 */}
                        <div className="flex items-center justify-between bg-[var(--brand)]/10 rounded-xl p-3 border border-[var(--brand)]/20 relative">
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand)]/20 text-[10px] font-bold text-brand">3</div>
                            <span className="text-sm font-medium text-brand">Сгенерировано AI</span>
                          </div>
                          <span className="text-lg font-bold font-mono text-text-main">{stats.reviews_completed}</span>
                          <div className="absolute -bottom-2.5 left-6 h-2.5 w-px bg-[var(--brand)]/20"></div>
                        </div>
                        
                        {/* Step 4 (Branching) */}
                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <div className="flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 text-center">
                            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{Math.max(0, stats.reviews_completed - stats.negative_captured)}</span>
                            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-200/80 mt-1 uppercase tracking-wider font-semibold">Ушли на карты</span>
                          </div>
                          <div className="flex flex-col items-center justify-center bg-orange-50 dark:bg-orange-500/10 rounded-xl p-3 border border-orange-500/20 text-center">
                            <span className="text-2xl font-bold font-mono text-orange-600 dark:text-orange-400">{stats.negative_captured}</span>
                            <span className="text-[10px] text-orange-600/80 dark:text-orange-200/80 mt-1 uppercase tracking-wider font-semibold">Перехвачено</span>
                          </div>
                        </div>
                        
                      </div>
                    </div>
                  </CardShell>
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
                      {renderSvgChart(stats.daily_stats, "sent", "rated")}
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

                {/* Master Analytics Leaderboard */}
                {masters.length > 0 && (
                  <section className="rounded-card bg-[var(--surface)] shadow-sm p-6 sm:p-8">
                    <div>
                      <h3 className="text-lg font-bold text-text-main">Аналитика по мастерам</h3>
                      <p className="mt-1 text-sm text-text-muted">Эффективность сотрудников (от худших к лучшим) и AI-разбор</p>
                    </div>

                    <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border-subtle)] bg-slate-50 dark:bg-zinc-800/30 text-xs font-semibold uppercase tracking-wider text-text-muted">
                            <th className="py-3 pl-4 w-auto">Мастер</th>
                            <th className="py-3">Балл</th>
                            <th className="py-3 text-center">Сгенерировано</th>
                            <th className="py-3 text-center">Перехвачено</th>
                            <th className="py-3 pr-4 text-right">AI-Вердикт</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...masters].sort((a, b) => a.avg_rating - b.avg_rating).map((master, idx) => (
                            <tr key={master.name} className={`border-b last:border-0 border-[var(--border-subtle)] hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50/50 dark:bg-zinc-800/20'} ${selectedMaster === master.name ? 'bg-slate-100 dark:bg-zinc-800/80' : ''}`}>
                              <td className="py-3 pl-4">
                                <div className="flex items-center gap-3">
                                  <Avatar name={master.name} className="h-8 w-8 shrink-0" />
                                  <span className="font-bold text-text-main">{master.name}</span>
                                </div>
                              </td>
                              <td className="py-3">
                                <span className="inline-flex items-center gap-1 font-bold text-text-main">
                                  <RiStarFill className="w-4 h-4 text-slate-300 dark:text-zinc-600" />
                                  <span className={master.avg_rating < 4 ? 'text-red-600 dark:text-red-500' : 'text-emerald-600 dark:text-emerald-500'}>
                                    {master.avg_rating.toFixed(1)}
                                  </span>
                                </span>
                              </td>
                              <td className="py-3 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{master.positive_count || 0}</td>
                              <td className="py-3 text-center font-mono text-red-600 dark:text-red-500 font-semibold">{master.negative_count || 0}</td>
                              <td className="py-3 pr-4 text-right">
                                <button
                                  onClick={() => setSelectedMaster(selectedMaster === master.name ? null : master.name)}
                                  className={`group inline-flex items-center justify-center p-2 rounded-lg transition-colors ${selectedMaster === master.name ? 'bg-slate-200 dark:bg-zinc-700 text-text-main' : 'text-slate-400 hover:bg-slate-100 hover:text-brand dark:hover:bg-zinc-800'}`}
                                  title="Запросить анализ"
                                >
                                  <RiSparklingFill className="w-5 h-5" />
                                  <span className="sr-only">AI анализ</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {selectedMaster && (
                      <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] grid gap-6 md:grid-cols-2 animate-fade-in">
                        {loadingMasterStats ? (
                          <div className="col-span-full py-12 flex flex-col items-center justify-center space-y-4">
                            <div className="w-8 h-8 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
                            <p className="text-sm text-text-muted">Анализируем отзывы мастера...</p>
                          </div>
                        ) : masterStats ? (
                          <>
                            {/* График мастера */}
                            <div className="overflow-hidden rounded-2xl bg-[var(--dashboard-bg)] p-4 sm:p-6 flex flex-col justify-center">
                              <h4 className="text-sm font-semibold text-text-main mb-4">Динамика оценок</h4>
                              {masterStats.daily.length > 0 ? (
                                renderSvgChart(masterStats.daily, "count", null, "#3b82f6")
                              ) : (
                                <p className="text-xs text-text-muted">Нет данных для графика</p>
                              )}
                            </div>
                            
                            {/* Инсайт мастера */}
                            <div className="flex flex-col gap-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-[var(--dashboard-bg)] p-4">
                                  <p className="text-xs text-text-muted mb-1">Оценок</p>
                                  <p className="text-2xl font-bold text-text-main">{masterStats.total_rated}</p>
                                </div>
                                <div className="rounded-xl bg-[var(--dashboard-bg)] p-4">
                                  <p className="text-xs text-text-muted mb-1">Средний балл</p>
                                  <p className="text-2xl font-bold text-text-main flex items-center gap-1">
                                    <RiStarFill className="w-5 h-5 text-[var(--brand)]" />
                                    {masterStats.avg_rating}
                                  </p>
                                </div>
                              </div>
                              
                              <div className={`mt-2 rounded-xl p-4 sm:p-5 ${masterStats.avg_rating < 4 ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30' : 'ai-glow-effect'}`}>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${masterStats.avg_rating < 4 ? 'text-orange-800 dark:text-orange-300' : 'text-[var(--brand)]'}`}>
                                  AI Анализ
                                </h4>
                                <p className={`text-sm leading-relaxed ${masterStats.avg_rating < 4 ? 'text-orange-900 dark:text-orange-200' : 'text-[var(--brand)] drop-shadow-sm'}`}>
                                  {masterStats.insight}
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="col-span-full py-8 text-center text-text-muted">
                            Не удалось загрузить данные
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}
                
                {/* Recent Reviews Summary */}
                <section className="mt-8">
                  
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
                        reviewsData.reviews.slice(0, 4).map((r) => (
                          <li
                            key={r.id}
                            className="relative bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-sm transition-shadow hover:shadow-md"
                          >
                            {/* Master Badge in Top Right */}
                            {r.master_name && (
                              <div className="absolute top-5 right-5 inline-flex items-center rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                                [М] {r.master_name}
                              </div>
                            )}

                            {/* Header: Client Name, Date, Service */}
                            <div className="mb-4 pr-24">
                              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight">{r.client_name || "Без имени"}</h4>
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5 font-medium">
                                {new Date(r.created_at).toLocaleDateString("ru-RU", { day: 'numeric', month: 'long', year: 'numeric' })} • {r.service_name || "Услуга не указана"}
                              </p>
                            </div>

                            {/* Rating */}
                            <div className="mb-4 flex items-center gap-3">
                              {renderStars(r.rating)}
                            </div>

                            {/* Content */}
                            {r.rating !== null && r.rating <= 3 && r.owner_feedback && (
                              <div className="mt-5 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 p-4 rounded-r-xl">
                                <div className="flex items-start gap-3">
                                  <RiErrorWarningFill className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                  <div className="w-full">
                                    <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed font-medium">{r.owner_feedback}</p>
                                    <div className="mt-4 flex items-center justify-between border-t border-red-200/50 dark:border-red-900/30 pt-3">
                                      <span className={`text-[11px] font-bold uppercase tracking-wider ${r.is_resolved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {r.is_resolved ? '✓ Улажено' : '⚠ В работе'}
                                      </span>
                                      <button
                                        onClick={(e) => { e.preventDefault(); handleToggleResolve(r.id, r.is_resolved); }}
                                        className="px-4 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                      >
                                        {r.is_resolved ? 'Отменить статус' : 'Отметить как улаженное'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {r.rating !== null && r.rating >= 4 && r.generated_review && (
                              <div className="mt-5 text-sm text-gray-900 dark:text-gray-100 leading-relaxed not-italic bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-[var(--border-subtle)]">
                                {r.generated_review}
                              </div>
                            )}

                            {r.rating !== null && r.rating <= 3 && !r.owner_feedback && (
                              <div className="mt-5 text-sm text-slate-400 italic">
                                Клиент не оставил текстовый комментарий.
                              </div>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  </CardShell>


                </section>
              </div>
            )}

            {/* REVIEWS HISTORY TAB */}
            {activeTab === "reviews" && reviewsData && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-[var(--spacing-fluid-lg)] items-start">
                
                {/* Left Column: Reviews List */}
                <div className="xl:col-span-8 flex flex-col gap-6">
                  <CardShell>
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-text-main">История сбора отзывов</h3>
                        <p className="mt-1 text-sm text-text-muted">Все диалоги и оценки по вашему бизнесу</p>
                      </div>

                      <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-zinc-800 p-1">
                        <button
                          onClick={() => handleReviewFilterChange("all")}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                            reviewFilter === "all" ? "bg-surface text-text-main dark:text-slate-100 shadow-sm bg-white" : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          Все отзывы
                        </button>
                        <button
                          onClick={() => handleReviewFilterChange("negative")}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                            reviewFilter === "negative" ? "bg-surface text-text-main dark:text-slate-100 shadow-sm bg-white" : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          Негативные (1-3★)
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {reviewsData.reviews.length === 0 ? (
                        <div className="py-12 text-center text-sm text-text-muted bg-slate-50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700">
                          Подходящие отзывы не найдены.
                        </div>
                      ) : (
                        reviewsData.reviews.map((review) => (
                          <div key={review.id} className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-[var(--border-subtle)] p-5 shadow-sm transition-shadow hover:shadow-md">
                            
                            {/* Master Badge in Top Right */}
                            {review.master_name && (
                              <div className="absolute top-5 right-5 inline-flex items-center rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                                [М] {review.master_name}
                              </div>
                            )}

                            {/* Header: Client Name, Date, Service */}
                            <div className="mb-4 pr-24">
                              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight">{review.client_name || "Без имени"}</h4>
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5 font-medium">
                                {new Date(review.created_at).toLocaleDateString("ru-RU", { day: 'numeric', month: 'long', year: 'numeric' })} • {review.service_name || "Услуга не указана"}
                              </p>
                            </div>

                            {/* Rating */}
                            <div className="mb-4 flex items-center gap-3">
                              {renderStars(review.rating)}
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                (review.rating !== null || review.status === "completed") ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-400"
                              }`}>
                                {(review.rating !== null || review.status === "completed") ? "Получен" : "Ожидает"}
                              </span>
                            </div>

                            {/* Content */}
                            {review.rating !== null && review.rating <= 3 && review.owner_feedback ? (
                              <div className="mt-5 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 p-4 rounded-r-xl">
                                <div className="flex items-start gap-3">
                                  <RiErrorWarningFill className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                  <div className="w-full">
                                    <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed font-medium">{review.owner_feedback}</p>
                                    <div className="mt-4 flex items-center justify-between border-t border-red-200/50 dark:border-red-900/30 pt-3">
                                      <span className={`text-[11px] font-bold uppercase tracking-wider ${review.is_resolved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {review.is_resolved ? '✓ Улажено' : '⚠ В работе'}
                                      </span>
                                      <button
                                        onClick={(e) => { e.preventDefault(); handleToggleResolve(review.id, review.is_resolved); }}
                                        className="px-4 py-2 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                      >
                                        {review.is_resolved ? 'Отменить статус' : 'Отметить как улаженное'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : review.generated_review ? (
                              <div className="mt-5 text-sm text-gray-900 dark:text-gray-100 leading-relaxed not-italic bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-[var(--border-subtle)]">
                                {review.generated_review}
                              </div>
                            ) : (
                              <div className="mt-5 text-sm text-slate-400 italic">
                                {review.rating !== null ? "Клиент не оставил текстовый комментарий." : "Клиент еще не оценил визит."}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-[var(--border-subtle)] pt-6 text-sm">
                      <span className="text-text-muted font-medium">
                        Показано <b className="text-text-main">{reviewsOffset + 1}-{Math.min(reviewsOffset + REVIEWS_LIMIT, reviewsData.total_count)}</b> из <b className="text-text-main">{reviewsData.total_count}</b>
                      </span>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewsPageChange("prev")}
                          disabled={reviewsOffset === 0}
                          className="rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm"
                        >
                          Назад
                        </button>
                        <button
                          onClick={() => handleReviewsPageChange("next")}
                          disabled={reviewsOffset + REVIEWS_LIMIT >= reviewsData.total_count}
                          className="rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm"
                        >
                          Вперед
                        </button>
                      </div>
                    </div>
                  </CardShell>
                </div>

                {/* Right Column: Leaderboard */}
                <div className="xl:col-span-4">
                  <CardShell className="sticky top-28 bg-[var(--surface)] shadow-sm border border-[var(--border-subtle)]">
                    <h3 className="text-lg font-bold text-text-main mb-6">Рейтинг мастеров</h3>
                    {masters.length === 0 ? (
                      <div className="text-sm text-text-muted text-center py-6">Нет данных о мастерах</div>
                    ) : (
                      <div className="space-y-4">
                        {[...masters].sort((a, b) => b.avg_rating - a.avg_rating).map((m, idx) => (
                          <div key={m.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors border border-transparent hover:border-[var(--border-subtle)]">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 w-5 text-center">{idx + 1}</span>
                              <Avatar name={m.name} className="h-10 w-10 shrink-0" />
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{m.name}</p>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">{m.review_count} отзывов</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="flex items-center gap-1 font-bold text-sm text-gray-900 dark:text-white">
                                <RiStarFill className="w-4 h-4 text-brand" />
                                {m.avg_rating.toFixed(1)}
                              </span>
                              {m.negative_count > 0 && (
                                <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded">
                                  {m.negative_count} жалоб
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardShell>
                </div>
                
              </div>
            )}

            {/* LOCATIONS TAB */}
            {activeTab === "locations" && settings && (
              <div className="space-y-6">
                {/* Locations list */}
                <CardShell>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-text-main">Управление филиалами</h3>
                      <p className="mt-1 text-sm text-text-muted">Настройка ссылок на карты и слагов перенаправления для каждой точки</p>
                    </div>
                    <button
                      onClick={() => setIsLocModalOpen(true)}
                      className="rounded-full bg-brand hover:bg-brand-hover px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm active:scale-95 focus:ring-2 focus:ring-brand focus:outline-none focus:ring-offset-2 shrink-0"
                    >
                      + Добавить филиал
                    </button>
                  </div>

                  <div className="mt-6 space-y-4">
                    {settings.locations.length === 0 ? (
                      <p className="text-center text-xs text-text-muted py-12">Точки еще не добавлены. Нажмите «+ Добавить филиал».</p>
                    ) : (
                      settings.locations.map((loc) => (
                        <div key={loc.id} className="rounded-2xl border border-[var(--border-subtle)] p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all bg-white dark:bg-zinc-900/30">
                          <div className="space-y-2">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">{loc.name}</h4>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                              Редирект: <a href={`${REDIRECT_BASE}/${loc.redirect_slug}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline font-mono">reviewflow.kz/go/{loc.redirect_slug}</a>
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                              {loc.gis_2gis_url ? (
                                <a href={loc.gis_2gis_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-medium hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  ✓ 2ГИС
                                </a>
                              ) : (
                                <button onClick={() => handleStartEditLocation(loc)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 font-medium hover:bg-slate-200 dark:bg-zinc-800 dark:text-slate-400 dark:hover:bg-zinc-700 transition-colors">
                                  + Добавить 2ГИС
                                </button>
                              )}
                              {loc.yandex_maps_url ? (
                                <a href={loc.yandex_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-medium hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  ✓ Яндекс
                                </a>
                              ) : (
                                <button onClick={() => handleStartEditLocation(loc)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 font-medium hover:bg-slate-200 dark:bg-zinc-800 dark:text-slate-400 dark:hover:bg-zinc-700 transition-colors">
                                  + Добавить Яндекс
                                </button>
                              )}
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

                {/* Add/Edit Location form Modal */}
                {isLocModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-all animate-fade-in overflow-y-auto">
                    <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-8 shadow-2xl border border-[var(--border-subtle)] transform transition-all scale-100 my-8">
                      <div>
                        <h3 className="text-xl font-bold text-text-main">
                          {editingLocId ? "Редактировать локацию" : "Новый филиал"}
                        </h3>
                        <p className="mt-1 text-sm text-text-muted">
                          {editingLocId ? "Изменение ссылок для выбранной точки" : "Создание новой точки с уникальным слагом"}
                        </p>
                      </div>

                      <form onSubmit={handleSaveLocation} className="mt-6 space-y-5">
                        {locError && (
                          <div className="rounded-xl bg-red-50 p-4 text-xs text-red-800">{locError}</div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Название филиала *</label>
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

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Слаг для редиректа *</label>
                          <input
                            type="text"
                            required
                            disabled={editingLocId !== null}
                            value={newLocSlug}
                            onChange={(e) => handleLocChange("slug", e.target.value)}
                            onBlur={() => handleLocBlur("slug")}
                            placeholder="Например, dostyk"
                            className={`w-full rounded-2xl border bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none disabled:bg-slate-50 disabled:dark:bg-zinc-900/50 disabled:text-slate-400 disabled:dark:text-zinc-600 transition-colors ${locFieldErrors.slug ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-border-subtle focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                          />
                          {locFieldErrors.slug && <p className="mt-1 text-xs text-error animate-fade-in">{locFieldErrors.slug}</p>}
                          {!editingLocId && !locFieldErrors.slug && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Ссылка: <b>reviewflow.kz/go/{newLocSlug || "слаг"}</b></p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ссылка 2ГИС (опционально)</label>
                          <input
                            type="url"
                            value={newLocGis}
                            onChange={(e) => setNewLocGis(e.target.value)}
                            placeholder="Ссылка на филиал в 2ГИС"
                            className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ссылка Яндекс.Карты (опционально)</label>
                          <input
                            type="url"
                            value={newLocYandex}
                            onChange={(e) => setNewLocYandex(e.target.value)}
                            placeholder="Ссылка на филиал в Яндекс.Картах"
                            className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button
                            type="button"
                            onClick={handleCancelEditLocation}
                            className="flex-1 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors active:scale-95 focus:ring-2 focus:ring-slate-300 dark:focus:ring-zinc-600 focus:outline-none"
                          >
                            Отмена
                          </button>
                          <button
                            type="submit"
                            className="flex-1 rounded-full bg-brand hover:bg-brand-hover py-3.5 text-sm font-semibold text-white transition-colors shadow-md active:scale-95 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {editingLocId ? "Сохранить" : "Создать"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
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
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Профиль бизнеса</h4>
                    
                    <div className="grid gap-[var(--spacing-fluid-md)] grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Название бизнеса *</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.name}
                          onChange={(e) => handleSettingsChange("name", e.target.value)}
                          onBlur={() => handleSettingsBlur("name")}
                          className={`w-full rounded-lg border bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors ${settingsFieldErrors.name ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-border-subtle focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                        />
                        {settingsFieldErrors.name && <p className="mt-1 text-xs text-error animate-fade-in">{settingsFieldErrors.name}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Категория / Сфера *</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.category}
                          onChange={(e) => handleSettingsChange("category", e.target.value)}
                          onBlur={() => handleSettingsBlur("category")}
                          placeholder="Например, Салон красоты"
                          className={`w-full rounded-lg border bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors ${settingsFieldErrors.category ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-border-subtle focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                        />
                        {settingsFieldErrors.category && <p className="mt-1 text-xs text-error animate-fade-in">{settingsFieldErrors.category}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5 max-w-sm">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Контактный телефон *</label>
                      <input
                        type="tel"
                        required
                        value={settingsForm.phone}
                        onChange={(e) => handleSettingsChange("phone", e.target.value)}
                        onBlur={() => handleSettingsBlur("phone")}
                        className={`w-full rounded-lg border bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors ${settingsFieldErrors.phone ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-border-subtle focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                      />
                      {settingsFieldErrors.phone && <p className="mt-1 text-xs text-error animate-fade-in">{settingsFieldErrors.phone}</p>}
                    </div>
                  </div>

                  {/* Section 2: CRM & Webhooks */}
                  <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-zinc-800">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Интеграция CRM</h4>
                    
                    <div className="grid gap-[var(--spacing-fluid-md)] grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                      <div className="space-y-1.5 max-w-sm">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Тип CRM</label>
                        <select
                          value={settingsForm.crm_type}
                          onChange={(e) => setSettingsForm({ ...settingsForm, crm_type: e.target.value })}
                          className="w-full rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                        >
                          <option value="">Без интеграции (вручную)</option>
                          <option value="yclients">YClients</option>
                          <option value="amocrm">amoCRM</option>
                          <option value="bitrix24">Битрикс24</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Секрет вебхука (только чтение)</label>
                        <div className="relative flex max-w-sm">
                          <input
                            type={showWebhookSecret ? "text" : "password"}
                            readOnly
                            value={settings.crm_webhook_secret}
                            className="w-full rounded-lg border border-border-subtle bg-slate-50 dark:bg-zinc-900/50 px-4 py-3 pr-20 text-sm font-mono text-slate-700 dark:text-slate-300 focus:outline-none"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <button
                              type="button"
                              onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800"
                              title={showWebhookSecret ? "Скрыть" : "Показать"}
                            >
                              {showWebhookSecret ? <RiEyeOffLine className="h-4 w-4" /> : <RiEyeLine className="h-4 w-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(settings.crm_webhook_secret);
                                setCopiedWebhookSecret(true);
                                setTimeout(() => setCopiedWebhookSecret(false), 2000);
                              }}
                              className="p-1.5 text-slate-400 hover:text-brand transition-colors rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800"
                              title="Копировать"
                            >
                              {copiedWebhookSecret ? <RiCheckLine className="h-4 w-4 text-green-500" /> : <RiFileCopyLine className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">Используйте этот секрет для проверки входящих событий</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Default Map URLs & Alerts */}
                  <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-zinc-800">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Глобальные ссылки и оповещения</h4>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Дефолтная ссылка 2ГИС</label>
                      <input
                        type="url"
                        value={settingsForm.gis_2gis_url}
                        onChange={(e) => setSettingsForm({ ...settingsForm, gis_2gis_url: e.target.value })}
                        placeholder="Будет использоваться, если у филиала нет индивидуальной ссылки"
                        className="w-full rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Дефолтная ссылка Яндекс.Карты</label>
                      <input
                        type="url"
                        value={settingsForm.yandex_maps_url}
                        onChange={(e) => setSettingsForm({ ...settingsForm, yandex_maps_url: e.target.value })}
                        placeholder="Будет использоваться, если у филиала нет индивидуальной ссылки"
                        className="w-full rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5 max-w-sm pt-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Telegram Chat ID (Оповещения)</label>
                      <input
                        type="text"
                        value={settingsForm.telegram_chat_id}
                        onChange={(e) => setSettingsForm({ ...settingsForm, telegram_chat_id: e.target.value.trim() })}
                        placeholder="Например, 123456789"
                        className="w-full rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm text-text-main dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">На этот чат будут приходить уведомления о негативе</p>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <button
                      type="submit"
                      className="w-auto px-8 rounded-lg bg-brand hover:bg-brand-hover py-3 text-sm font-medium text-white transition-all shadow-sm hover:shadow active:scale-[0.98] focus:ring-2 focus:ring-[var(--brand)] focus:outline-none focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className={`relative rounded-3xl p-6 border border-border-subtle bg-surface transition-all`}>
                    {billing.plan === "light" && <div className="absolute top-0 right-0 rounded-bl-xl rounded-tr-3xl bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Текущий</div>}
                    <div className="min-h-[130px]">
                      <h4 className="text-lg font-bold text-text-main">Start</h4>
                      <p className="mt-1 text-xs text-text-muted min-h-[40px]">Базовые возможности для начала</p>
                      <div className="my-4 flex items-end h-[32px] text-2xl font-extrabold text-text-main">10 000 ₸<span className="text-sm font-normal text-text-muted mb-1 ml-1">/мес</span></div>
                    </div>
                    <ul className="space-y-3 text-sm text-slate-800 dark:text-slate-200 mb-6">
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Обычная рассылка сообщений</li>
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Перехват негатива в Telegram</li>
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Маршрутизация на 2GIS/Yandex</li>
                    </ul>
                    <button onClick={() => handleSubscribe("light")} className={`w-full rounded-full py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${billing.plan === "light" ? "cursor-default bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 border border-transparent" : "bg-transparent border border-border-subtle text-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-[0.96] focus:ring-slate-300 dark:focus:ring-zinc-600"}`} disabled={billing.plan === "light"}>
                      {billing.plan === "light" ? "Активен" : "Выбрать Start"}
                    </button>
                  </div>

                  {/* PRO Plan */}
                  <div className={`relative rounded-3xl p-6 border-2 border-brand bg-brand/5 shadow-lg transform scale-105 z-10 transition-all`}>
                    {billing.plan === "standard" ? (
                      <div className="absolute top-0 right-0 rounded-bl-xl rounded-tr-3xl bg-brand px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">Текущий (Популярный)</div>
                    ) : (
                      <div className="absolute top-0 right-0 rounded-bl-xl rounded-tr-3xl bg-gradient-to-r from-orange-400 to-pink-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">Популярный</div>
                    )}
                    <div className="min-h-[130px]">
                      <h4 className="text-lg font-bold text-text-main">Pro</h4>
                      <p className="mt-1 text-xs text-text-muted min-h-[40px]">Максимум отзывов с искусственным интеллектом</p>
                      <div className="my-4 flex items-end h-[32px] text-2xl font-extrabold text-text-main">15 000 ₸<span className="text-sm font-normal text-text-muted mb-1 ml-1">/мес</span></div>
                    </div>
                    <ul className="space-y-3 text-sm text-slate-800 dark:text-slate-200 mb-6">
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Всё из тарифа Start</li>
                      <li className="flex gap-2 font-medium text-text-main dark:text-slate-200 items-start"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> <span>ИИ-генерация отзывов <span className="ml-1 rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand uppercase inline-block">Новое</span></span></li>
                      <li className="flex gap-2 font-medium text-text-main dark:text-slate-200 items-start"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> <span>Умный тайминг отправки <span className="ml-1 rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand uppercase inline-block">Новое</span></span></li>
                    </ul>
                    <button onClick={() => handleSubscribe("standard")} className={`w-full rounded-full py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${billing.plan === "standard" ? "cursor-default bg-brand/80 text-white border border-transparent shadow-sm" : "bg-brand text-white hover:bg-brand-hover active:scale-[0.96] shadow-md hover:shadow-lg focus:ring-[var(--brand)]/30"}`} disabled={billing.plan === "standard"}>
                      {billing.plan === "standard" ? "Активен" : "Выбрать Pro"}
                    </button>
                  </div>

                  {/* ENTERPRISE Plan */}
                  <div className={`relative rounded-3xl p-6 border border-border-subtle bg-surface transition-all`}>
                    {billing.plan === "network" && <div className="absolute top-0 right-0 rounded-bl-xl rounded-tr-3xl bg-slate-100 dark:bg-zinc-800 px-3 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Текущий</div>}
                    <div className="min-h-[130px]">
                      <h4 className="text-lg font-bold text-text-main">Enterprise</h4>
                      <p className="mt-1 text-xs text-text-muted min-h-[40px]">Для сетей и крупных проектов</p>
                      <div className="my-4 flex items-end h-[32px] text-2xl font-extrabold text-text-main">Индивидуально</div>
                    </div>
                    <ul className="space-y-3 text-sm text-slate-800 dark:text-slate-200 mb-6">
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Всё из тарифа Pro</li>
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Несколько локаций/филиалов</li>
                      <li className="flex gap-2"><RiCheckLine className="h-5 w-5 text-green-500 shrink-0"/> Приоритетная поддержка</li>
                    </ul>
                    <button onClick={() => handleSubscribe("network")} className={`w-full rounded-full py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${billing.plan === "network" ? "cursor-default bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 border border-transparent" : "bg-transparent border border-border-subtle text-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-[0.96] focus:ring-slate-300 dark:focus:ring-zinc-600"}`} disabled={billing.plan === "network"}>
                      {billing.plan === "network" ? "Активен" : "Связаться с нами"}
                    </button>
                  </div>
                </div>

                <CardShell className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border border-border-subtle shadow-sm bg-surface">
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
                    className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors border ${
                      billing.is_manually_paused 
                        ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/50" 
                        : "bg-transparent border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/30 dark:text-red-500 dark:hover:bg-red-900/20"
                    }`}
                  >
                    {billing.is_manually_paused ? "Возобновить рассылки" : "Приостановить рассылки"}
                  </button>
                </CardShell>

              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="max-w-3xl space-y-6">
                <CardShell>
                  <div>
                    <h3 className="text-lg font-bold text-text-main">Личные данные</h3>
                    <p className="mt-1 text-sm text-text-muted">Управляйте настройками вашего профиля и безопасностью.</p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="mt-6 space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Имя пользователя</label>
                        <input
                          type="text"
                          value={profileForm.full_name}
                          onChange={(e) => handleProfileChange("full_name", e.target.value)}
                          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--dashboard-bg)] px-4 py-3 text-sm text-text-main placeholder-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Email (Логин)</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => handleProfileChange("email", e.target.value)}
                          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--dashboard-bg)] px-4 py-3 text-sm text-text-main placeholder-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div className="border-t border-border-subtle pt-6">
                      <h4 className="text-sm font-semibold text-text-main mb-4">Смена пароля (если требуется)</h4>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-text-muted">Текущий пароль</label>
                          <input
                            type="password"
                            value={profileForm.current_password}
                            onChange={(e) => handleProfileChange("current_password", e.target.value)}
                            placeholder="Введите для подтверждения"
                            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--dashboard-bg)] px-4 py-3 text-sm text-text-main placeholder-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-text-muted">Новый пароль</label>
                          <input
                            type="password"
                            value={profileForm.new_password}
                            onChange={(e) => handleProfileChange("new_password", e.target.value)}
                            placeholder="Минимум 12 символов"
                            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--dashboard-bg)] px-4 py-3 text-sm text-text-main placeholder-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-text-muted">
                        Внимание: для сохранения нового email или пароля необходимо ввести текущий пароль.
                      </p>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex-1">
                        {profileMsg && (
                          <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${
                            profileMsg.type === "success" 
                              ? "bg-[var(--success)]/10 text-[var(--success)]" 
                              : "bg-[var(--error)]/10 text-[var(--error)]"
                          }`}>
                            {profileMsg.text}
                          </div>
                        )}
                      </div>
                      <button
                        type="submit"
                        className="w-full sm:w-auto shrink-0 rounded-full bg-[var(--brand)] px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-brand-hover hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 active:scale-[0.98]"
                      >
                        Сохранить изменения
                      </button>
                    </div>
                  </form>
                </CardShell>

                <CardShell className="border-red-200 dark:border-red-900/30">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-row items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-text-main">Тема оформления</h4>
                        <p className="text-xs text-text-muted mt-1">Переключение между светлой и темной темой.</p>
                      </div>
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="rounded-full bg-slate-100 dark:bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-text-main hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-[var(--border-subtle)]"
                      >
                        {darkMode ? "Светлая тема" : "Темная тема"}
                      </button>
                    </div>
                    <div className="border-t border-red-200 dark:border-red-900/30 my-2"></div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-red-600 dark:text-red-500">Завершение сеанса</h4>
                        <p className="text-xs text-text-muted mt-1">Выйти из учетной записи на этом устройстве.</p>
                      </div>
                      {onLogout && (
                        <button
                          onClick={onLogout}
                          className="rounded-full bg-red-50 dark:bg-red-900/20 px-6 py-2.5 text-sm font-semibold text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800/30"
                        >
                          Выйти из аккаунта
                        </button>
                      )}
                    </div>
                  </div>
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
