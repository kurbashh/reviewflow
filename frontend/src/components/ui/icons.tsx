import type { ReactNode } from "react";
import {
  RiDashboardLine,
  RiMessage3Line,
  RiBarChartBoxLine,
  RiMapPin2Line,
  RiSettings4Line,
  RiSearchLine,
  RiNotification3Line,
  RiStarFill,
  RiArrowRightUpLine,
  RiArrowRightLine,
  RiAddLine,
  RiSunLine,
  RiMoonLine
} from "@remixicon/react";

type IconProps = {
  className?: string;
};

export function IconOverview({ className }: IconProps) {
  return <RiDashboardLine className={className} />;
}

export function IconReviews({ className }: IconProps) {
  return <RiMessage3Line className={className} />;
}

export function IconAnalytics({ className }: IconProps) {
  return <RiBarChartBoxLine className={className} />;
}

export function IconLocations({ className }: IconProps) {
  return <RiMapPin2Line className={className} />;
}

export function IconSettings({ className }: IconProps) {
  return <RiSettings4Line className={className} />;
}

export function IconSearch({ className }: IconProps) {
  return <RiSearchLine className={className} />;
}

export function IconBell({ className }: IconProps) {
  return <RiNotification3Line className={className} />;
}

export function IconStar({ className }: IconProps) {
  return <RiStarFill className={className} />;
}

export function IconTrendUp({ className }: IconProps) {
  return <RiArrowRightUpLine className={className} />;
}

export function IconArrowRight({ className }: IconProps) {
  return <RiArrowRightLine className={className} />;
}

export function IconPlus({ className }: IconProps) {
  return <RiAddLine className={className} />;
}

export function IconSun({ className }: IconProps) {
  return <RiSunLine className={className} />;
}

export function IconMoon({ className }: IconProps) {
  return <RiMoonLine className={className} />;
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
    <section className={`rounded-card border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-main)] p-6 shadow-[var(--shadow-soft)] transition-colors duration-200 ${className}`}>
      {children}
    </section>
  );
}
