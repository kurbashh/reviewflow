import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

export function IconOverview({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconReviews({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  );
}

export function IconAnalytics({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 17V11" />
      <path d="M12 17V7" />
      <path d="M16 17v-4" />
    </svg>
  );
}

export function IconLocations({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconBell({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function IconStar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function IconTrendUp({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconSun({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function IconMoon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function Sparkline({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 120 48" fill="none" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGradient" x1="0" y1="0" x2="120" y2="0">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#3B82F6" stopOpacity="0.18" />
          <stop offset="1" stopColor="#A855F7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 36 C 15 34, 20 18, 35 22 S 55 8, 70 16 S 95 28, 120 12 L 120 48 L 0 48 Z"
        fill="url(#sparkFill)"
      />
      <path
        d="M0 36 C 15 34, 20 18, 35 22 S 55 8, 70 16 S 95 28, 120 12"
        stroke="url(#sparkGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BarChartPlaceholder({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 560 220" fill="none" preserveAspectRatio="none">
      {[
        { x: 24, h: 92 },
        { x: 88, h: 128 },
        { x: 152, h: 74 },
        { x: 216, h: 156 },
        { x: 280, h: 110 },
        { x: 344, h: 180 },
        { x: 408, h: 98 },
        { x: 472, h: 142 },
      ].map((bar, index) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={200 - bar.h}
          width="48"
          height={bar.h}
          rx="12"
          fill={index === 5 ? "#FF6B35" : "#E2E8F0"}
        />
      ))}
    </svg>
  );
}

export function LineChartPlaceholder({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 720 260" fill="none" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FF6B35" stopOpacity="0.18" />
          <stop offset="1" stopColor="#FF6B35" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 90, 140, 190, 240].map((y) => (
        <line key={y} x1="0" y1={y} x2="720" y2={y} stroke="#F1F5F9" strokeWidth="1" />
      ))}
      <path
        d="M0 180 C 80 170, 120 110, 200 130 S 320 70, 400 95 S 560 40, 720 60 L 720 260 L 0 260 Z"
        fill="url(#lineFill)"
      />
      <path
        d="M0 180 C 80 170, 120 110, 200 130 S 320 70, 400 95 S 560 40, 720 60"
        stroke="#FF6B35"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M0 200 C 90 195, 140 160, 230 170 S 360 140, 450 150 S 590 120, 720 130"
        stroke="#CBD5E1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6 6"
      />
    </svg>
  );
}

export function MapPlaceholder({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 320 220" fill="none">
      <rect width="320" height="220" rx="24" fill="#F8FAFC" />
      <path
        d="M40 170 C 80 120, 120 150, 160 95 S 240 130, 280 70"
        stroke="url(#routeGradient)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="40" cy="170" r="8" fill="#FF6B35" />
      <circle cx="280" cy="70" r="8" fill="#3B82F6" />
      <defs>
        <linearGradient id="routeGradient" x1="40" y1="170" x2="280" y2="70">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoMark({ className }: IconProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white ${className ?? ""}`}
    >
      RF
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-semibold text-white ${className ?? ""}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export function CardShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card border border-[var(--border-subtle)] bg-[var(--dashboard-bg)] text-[var(--text-main)] p-6 shadow-[var(--shadow-soft)] transition-colors duration-200 ${className}`}>
      {children}
    </section>
  );
}
