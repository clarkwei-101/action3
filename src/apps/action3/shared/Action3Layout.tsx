'use client';
import * as React from 'react';
import { useRouter } from 'next/router';
import { usePathname } from 'next/navigation';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';

// ============================================================
// Achievement Unlock Context
// ============================================================
interface UnlockContext {
  showUnlock: (name: string, description: string, icon: string) => void;
}
const UnlockContext = createContext<UnlockContext>({ showUnlock: () => {} });
export const useUnlock = () => useContext(UnlockContext);

export function Action3Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [unlockData, setUnlockData] = useState<{ name: string; description: string; icon: string } | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerData, setBannerData] = useState<{ name: string; icon: string } | null>(null);

  const showUnlock = useCallback((name: string, description: string, icon: string) => {
    setUnlockData({ name, description, icon });
    setBannerData({ name, icon });
    setShowBanner(true);
    setTimeout(() => setUnlockData(null), 4000);
  }, []);

  useEffect(() => {
    if (bannerData) {
      const timer = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [bannerData]);

  const currentPage = (pathname ?? '').replace('/action3/', '') || 'home';

  const navItems = [
    { key: 'home', label: '目标', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', href: '/action3/home' },
    { key: 'recommend', label: '推荐', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', href: '/action3/recommend' },
    { key: 'skilltree', label: '技能树', icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18', href: '/action3/skilltree' },
    { key: 'classroom', label: '课堂', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0M7 10a2 2 0 11-4 0 2 2 0 014 0z', href: '/action3/classroom' },
    { key: 'calendar', label: '日历', icon: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z', href: '/action3/calendar' },
    { key: 'courses', label: '学习资源', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', href: '/action3/courses' },
    { key: 'voice', label: '语音', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', href: '/action3/voice' },
    { key: 'achievements', label: '成就', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', href: '/action3/achievements' },
    { key: 'settings', label: '设置', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', href: '/action3/settings' },
  ];

  return (
    <UnlockContext.Provider value={{ showUnlock }}>
      <div style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
      }}>
        {/* Hydrate-safe: suppressHydrationWarning prevents SSR/client style tag mismatch */}
        <style suppressHydrationWarning>{`
          :root {
            /* Background Layers (OLED Deep, cool-gray family) */
            --bg-void:        #04040a;
            --bg-primary:     #05050b;
            --bg-secondary:   #0a0a14;
            --bg-card:       #0d0d1a;
            --bg-elevated:   #121222;
            --bg-overlay:     #181830;
            /* Accent: Emerald + Amber (no purple/blue AI blobs) */
            --accent-primary:         #10b981;
            --accent-primary-light:  #34d399;
            --accent-primary-dark:   #059669;
            --accent-primary-glow:  rgba(16, 185, 129, 0.20);
            --accent-secondary:        #f59e0b;
            --accent-secondary-light: #fbbf24;
            --accent-secondary-dark:   #d97706;
            --accent-secondary-glow:  rgba(245, 158, 11, 0.18);
            /* Functional Colors */
            --color-success:     #10b981;
            --color-success-bg:  rgba(16, 185, 129, 0.10);
            --color-warning:     #f59e0b;
            --color-warning-bg:  rgba(245, 158, 11, 0.10);
            --color-error:       #f87171;
            --color-error-bg:    rgba(248, 113, 113, 0.10);
            /* Learning Style Colors */
            --style-guided:           #10b981;
            --style-indoctrination:  #f59e0b;
            --style-encouragement:   #34d399;
            --style-strict:          #f87171;
            --style-first-principles: #fb923c;
            /* Text Layers */
            --text-primary:   #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted:     #4b5563;
            /* Borders / Dividers */
            --border-subtle:  rgba(255, 255, 255, 0.04);
            --border-light:   rgba(255, 255, 255, 0.07);
            --border-medium:  rgba(255, 255, 255, 0.10);
            --border-accent: rgba(16, 185, 129, 0.40);
            /* Gradient shortcuts */
            --gradient-accent: linear-gradient(135deg, #10b981, #059669);
            /* Liquid Glass System */
            --glass-bg: rgba(255, 255, 255, 0.025);
            --glass-bg-hover: rgba(255, 255, 255, 0.04);
            --glass-bg-active: rgba(255, 255, 255, 0.015);
            --glass-blur: blur(24px) saturate(160%);
            --glass-border: rgba(255, 255, 255, 0.07);
            --glass-border-hover: rgba(255, 255, 255, 0.12);
            --glass-border-accent: rgba(16, 185, 129, 0.35);
            --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
            --glass-shadow-hover: 0 16px 48px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3);
            --glass-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.1);
            --glass-shine: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.01) 100%);
            --glass-radius: 16px;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: var(--bg-primary); }

          /* Liquid Glass Card - Primary surface for all card-like elements */
          .lg-card {
            background: var(--glass-bg);
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            border: 1px solid var(--glass-border);
            border-radius: var(--glass-radius);
            box-shadow: var(--glass-shadow), var(--glass-highlight), var(--glass-shine);
            transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.32,0.72,0,1);
            position: relative;
            overflow: hidden;
          }
          .lg-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
            pointer-events: none;
          }
          .lg-card:hover {
            background: var(--glass-bg-hover);
            border-color: var(--glass-border-hover);
            box-shadow: var(--glass-shadow-hover), var(--glass-highlight), var(--glass-shine);
            transform: translateY(-2px);
          }
          .lg-card:active {
            background: var(--glass-bg-active);
            transform: translateY(0);
            box-shadow: var(--glass-shadow), var(--glass-highlight), var(--glass-shine);
          }

          /* Liquid Glass Card - Large variant (24px radius) */
          .lg-card-lg {
            border-radius: 24px;
          }

          /* Liquid Glass Card - Accent variant (emerald glow border) */
          .lg-card-accent {
            border-color: var(--glass-border-accent);
          }
          .lg-card-accent:hover {
            border-color: rgba(16, 185, 129, 0.5);
          }

          /* Liquid Glass Panel - Inner panel, slightly more opaque */
          .lg-panel {
            background: rgba(255, 255, 255, 0.035);
            backdrop-filter: blur(16px) saturate(140%);
            -webkit-backdrop-filter: blur(16px) saturate(140%);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.3);
          }

          /* Liquid Glass Button */
          .lg-btn {
            background: rgba(16, 185, 129, 0.12);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(16, 185, 129, 0.25);
            border-radius: 12px;
            color: var(--accent-primary-light);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.2s cubic-bezier(0.32,0.72,0,1);
            position: relative;
            overflow: hidden;
          }
          .lg-btn::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%);
            pointer-events: none;
          }
          .lg-btn:hover {
            background: rgba(16, 185, 129, 0.18);
            border-color: rgba(16, 185, 129, 0.4);
            transform: translateY(-1px);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 20px rgba(16,185,129,0.15);
          }
          .lg-btn:active {
            transform: translateY(0) scale(0.98);
            background: rgba(16, 185, 129, 0.08);
          }

          /* Liquid Glass Button - Primary gradient */
          .lg-btn-primary {
            background: linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(5,150,105,0.25) 100%);
            border-color: rgba(16, 185, 129, 0.35);
            color: #fff;
          }
          .lg-btn-primary:hover {
            background: linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(5,150,105,0.35) 100%);
            border-color: rgba(16, 185, 129, 0.5);
          }

          /* Liquid Glass Input */
          .lg-input {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            color: var(--text-primary);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), inset 0 2px 4px rgba(0,0,0,0.15);
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .lg-input:focus {
            outline: none;
            border-color: rgba(16, 185, 129, 0.5);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), inset 0 2px 4px rgba(0,0,0,0.15), 0 0 0 3px rgba(16,185,129,0.1);
          }
          .lg-input::placeholder {
            color: var(--text-muted);
          }

          /* Liquid Glass Overlay */
          .lg-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(12px) saturate(120%);
            -webkit-backdrop-filter: blur(12px) saturate(120%);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Grain texture (fixed, pointer-events-none) */
          .bg-grain {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 0;
            opacity: 0.025;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          }

          /* Ambient glow zones (emerald + amber, no purple) */
          .bg-ambient {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 0; overflow: hidden;
          }
          .glow-emerald {
            position: absolute; width: 800px; height: 800px;
            background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%);
            top: -250px; left: -200px; border-radius: 50%;
          }
          .glow-amber {
            position: absolute; width: 600px; height: 600px;
            background: radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%);
            bottom: -150px; right: -100px; border-radius: 50%;
          }
          .glow-emerald-2 {
            position: absolute; width: 450px; height: 450px;
            background: radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%);
            top: 40%; left: 50%; border-radius: 50%;
          }

          /* Organic flowing blob shapes (taste design reference) */
          .bg-organic {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 0; overflow: hidden;
          }
          .blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(90px);
            will-change: transform;
          }
          .blob-1 {
            width: 700px; height: 700px;
            background: radial-gradient(circle, rgba(16,185,129,0.09) 0%, transparent 65%);
            top: -250px; left: -200px;
            animation: blobFloat1 30s ease-in-out infinite;
          }
          .blob-2 {
            width: 550px; height: 550px;
            background: radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 65%);
            top: 20%; right: -180px;
            animation: blobFloat2 25s ease-in-out infinite;
          }
          .blob-3 {
            width: 450px; height: 450px;
            background: radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%);
            bottom: -100px; left: 30%;
            animation: blobFloat3 35s ease-in-out infinite;
          }
          .blob-4 {
            width: 350px; height: 350px;
            background: radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%);
            top: 55%; left: 10%;
            animation: blobFloat4 28s ease-in-out infinite;
          }
          @keyframes blobFloat1 {
            0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
            25% { transform: translate(40px, -30px) scale(1.08) rotate(5deg); }
            50% { transform: translate(-20px, 50px) scale(0.95) rotate(-3deg); }
            75% { transform: translate(30px, 20px) scale(1.04) rotate(2deg); }
          }
          @keyframes blobFloat2 {
            0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
            25% { transform: translate(-50px, 30px) scale(1.06) rotate(-4deg); }
            50% { transform: translate(20px, -40px) scale(0.92) rotate(6deg); }
            75% { transform: translate(-30px, -20px) scale(1.10) rotate(-2deg); }
          }
          @keyframes blobFloat3 {
            0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
            25% { transform: translate(-30px, 40px) scale(1.05) rotate(3deg); }
            50% { transform: translate(50px, -20px) scale(0.96) rotate(-5deg); }
            75% { transform: translate(10px, -30px) scale(1.07) rotate(4deg); }
          }
          @keyframes blobFloat4 {
            0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
            25% { transform: translate(20px, -50px) scale(1.03) rotate(-3deg); }
            50% { transform: translate(-40px, 10px) scale(0.98) rotate(5deg); }
            75% { transform: translate(30px, 30px) scale(1.05) rotate(-2deg); }
          }

          /* Fine grid (emerald-tinted, very subtle) */
          .bg-grid {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-image:
              linear-gradient(rgba(16,185,129,0.010) 1px, transparent 1px),
              linear-gradient(90deg, rgba(16,185,129,0.010) 1px, transparent 1px);
            background-size: 64px 64px;
          }

          /* Sidebar - Liquid Glass floating pill */
          .sidebar {
            position: relative; z-index: 10;
            width: 72px;
            display: flex; flex-direction: column; align-items: center;
            padding: 20px 0; gap: 4px; flex-shrink: 0;
            margin: 16px 12px 16px 12px;
            border-radius: 28px;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(32px) saturate(160%);
            -webkit-backdrop-filter: blur(32px) saturate(160%);
            border: 1px solid rgba(255, 255, 255, 0.06);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.06),
              inset 0 -1px 0 rgba(0,0,0,0.1),
              0 8px 40px rgba(0,0,0,0.5),
              0 2px 8px rgba(0,0,0,0.3);
          }
          .sidebar::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
            border-radius: 28px 28px 0 0;
          }
          .sidebar-logo {
            width: 44px; height: 44px;
            background: linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.15) 100%);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(16,185,129,0.25);
            border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; margin-bottom: 20px;
            transition: transform 0.2s cubic-bezier(0.32,0.72,0,1), box-shadow 0.2s, background 0.2s;
            box-shadow: 0 4px 16px var(--accent-primary-glow), inset 0 1px 0 rgba(255,255,255,0.08);
          }
          .sidebar-logo:hover {
            transform: scale(1.06);
            background: linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(5,150,105,0.2) 100%);
            box-shadow: 0 6px 24px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
          }
          .sidebar-logo:active { transform: scale(0.96); }
          .sidebar-logo svg { width: 22px; height: 22px; color: #10b981; }
          .sidebar-item {
            width: 44px; height: 44px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.32,0.72,0,1);
            color: var(--text-muted); background: transparent; border: 1px solid transparent;
            position: relative;
          }
          .sidebar-item:hover {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.06);
            color: var(--text-secondary);
          }
          .sidebar-item.active {
            background: rgba(16, 185, 129, 0.08);
            border-color: rgba(16, 185, 129, 0.15);
            color: var(--accent-primary);
            box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.10), 0 0 12px rgba(16,185,129,0.08);
          }
          .sidebar-item.active::before {
            content: '';
            position: absolute; left: -12px; top: 50%; transform: translateY(-50%);
            width: 3px; height: 20px;
            background: var(--accent-primary);
            border-radius: 0 2px 2px 0;
            box-shadow: 0 0 10px var(--accent-primary-glow);
          }
          .sidebar-item svg { width: 20px; height: 20px; }
          .sidebar-sep { width: 32px; height: 1px; background: rgba(255,255,255,0.05); margin: 8px 0; }

          .main-content { flex: 1; overflow-y: auto; position: relative; z-index: 1; }

          /* Custom scrollbar */
          .main-content::-webkit-scrollbar { width: 4px; }
          .main-content::-webkit-scrollbar-track { background: transparent; }
          .main-content::-webkit-scrollbar-thumb { background: var(--border-medium); border-radius: 2px; }
          .main-content::-webkit-scrollbar-thumb:hover { background: rgba(16,185,129,0.35); }

          /* Toast */
          .toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; }
          .toast {
            padding: 12px 20px; background: var(--bg-elevated);
            border: 1px solid var(--border-light); border-radius: 14px;
            color: var(--text-primary); font-size: 14px;
            animation: slideInA3 0.3s cubic-bezier(0.32,0.72,0,1);
          }
          @keyframes slideInA3 { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

          /* Achievement Unlock - Liquid Glass */
          .achievement-unlock-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(16px) saturate(140%);
            -webkit-backdrop-filter: blur(16px) saturate(140%);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            animation: fadeInA3 0.3s ease;
          }
          @keyframes fadeInA3 { from { opacity: 0; } to { opacity: 1; } }
          .achievement-unlock-card {
            background: rgba(255,255,255,0.04);
            backdrop-filter: blur(32px) saturate(160%);
            -webkit-backdrop-filter: blur(32px) saturate(160%);
            border: 1px solid rgba(16,185,129,0.35);
            border-radius: 32px; padding: 40px 48px; text-align: center; max-width: 360px;
            animation: scaleInA3 0.4s cubic-bezier(0.32,0.72,0,1);
            box-shadow: 0 0 80px var(--accent-primary-glow), 0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
          }
          @keyframes scaleInA3 { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .achievement-icon-wrap {
            width: 80px; height: 80px;
            background: linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(5,150,105,0.2) 100%);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(16,185,129,0.4);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            margin: 0 auto 20px; font-size: 36px;
            box-shadow: 0 8px 32px var(--accent-primary-glow), inset 0 1px 0 rgba(255,255,255,0.08);
          }
          .achievement-eyebrow {
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 2px; color: var(--accent-primary); margin-bottom: 8px;
          }
          .achievement-name { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
          .achievement-desc { font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; }
          .achievement-action {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 12px 28px;
            background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.25));
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(16,185,129,0.4);
            border-radius: 14px; color: #fff; font-weight: 600; font-size: 14px; cursor: pointer;
            transition: all 0.2s cubic-bezier(0.32,0.72,0,1);
            box-shadow: 0 4px 20px var(--accent-primary-glow), inset 0 1px 0 rgba(255,255,255,0.08);
          }
          .achievement-action:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }
          .achievement-action:active { transform: scale(0.97); }

          /* Recent Unlock Banner - Liquid Glass */
          .recent-unlock-banner {
            position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
            background: rgba(255,255,255,0.03);
            backdrop-filter: blur(24px) saturate(150%);
            -webkit-backdrop-filter: blur(24px) saturate(150%);
            border: 1px solid rgba(16,185,129,0.25);
            border-radius: 16px;
            padding: 10px 20px; display: flex; align-items: center; gap: 10px;
            font-size: 14px; color: var(--text-primary); z-index: 9998;
            animation: slideDownA3 0.4s cubic-bezier(0.32,0.72,0,1);
            box-shadow: 0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
          }
          @keyframes slideDownA3 { from { transform: translateX(-50%) translateY(-120%); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
          .banner-icon {
            width: 28px; height: 28px;
            background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15));
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(16,185,129,0.3);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
          }
          .banner-icon svg { width: 14px; height: 14px; }
          .banner-close {
            background: none; border: none; color: var(--text-muted); cursor: pointer;
            padding: 4px; display: flex; align-items: center; transition: color 0.2s;
          }
          .banner-close:hover { color: var(--text-secondary); }

          /* ============================================================
             Liquid Glass Design System - Global Classes
             ============================================================ */

          /* Base liquid glass card - use on any card container */
          .glass-card {
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.08),
              0 8px 32px rgba(0, 0, 0, 0.35);
            transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
          }
          .glass-card:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(16, 185, 129, 0.25);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              0 12px 48px rgba(16, 185, 129, 0.10),
              0 4px 16px rgba(0, 0, 0, 0.4);
            transform: translateY(-2px);
          }

          /* Primary liquid glass button */
          .glass-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 22px;
            background: rgba(16, 185, 129, 0.12);
            backdrop-filter: blur(16px) saturate(160%);
            -webkit-backdrop-filter: blur(16px) saturate(160%);
            border: 1px solid rgba(16, 185, 129, 0.30);
            border-radius: 14px;
            color: #34d399;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.08),
              0 4px 16px rgba(16, 185, 129, 0.15);
            user-select: none;
          }
          .glass-btn:hover {
            background: rgba(16, 185, 129, 0.20);
            border-color: rgba(16, 185, 129, 0.50);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              0 8px 28px rgba(16, 185, 129, 0.25);
            transform: translateY(-2px);
          }
          .glass-btn:active {
            transform: translateY(0) scale(0.97);
            box-shadow:
              inset 0 2px 4px rgba(0, 0, 0, 0.2),
              0 2px 8px rgba(16, 185, 129, 0.15);
          }
          .glass-btn:disabled {
            opacity: 0.35;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          /* Secondary / ghost liquid glass button */
          .glass-btn-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 22px;
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(16px) saturate(160%);
            -webkit-backdrop-filter: blur(16px) saturate(160%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.05),
              0 4px 16px rgba(0, 0, 0, 0.25);
            user-select: none;
          }
          .glass-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.15);
            color: var(--text-primary);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.08),
              0 8px 28px rgba(0, 0, 0, 0.30);
            transform: translateY(-2px);
          }
          .glass-btn-secondary:active {
            transform: translateY(0) scale(0.97);
          }
          .glass-btn-secondary:disabled {
            opacity: 0.30;
            cursor: not-allowed;
            transform: none;
          }

          /* Amber / accent variant */
          .glass-btn-amber {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 22px;
            background: rgba(245, 158, 11, 0.12);
            backdrop-filter: blur(16px) saturate(160%);
            -webkit-backdrop-filter: blur(16px) saturate(160%);
            border: 1px solid rgba(245, 158, 11, 0.30);
            border-radius: 14px;
            color: #fbbf24;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.08),
              0 4px 16px rgba(245, 158, 11, 0.15);
            user-select: none;
          }
          .glass-btn-amber:hover {
            background: rgba(245, 158, 11, 0.20);
            border-color: rgba(245, 158, 11, 0.50);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              0 8px 28px rgba(245, 158, 11, 0.25);
            transform: translateY(-2px);
          }
          .glass-btn-amber:active {
            transform: translateY(0) scale(0.97);
          }

          /* Small icon-only button variant */
          .glass-btn-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            padding: 0;
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(16px) saturate(160%);
            -webkit-backdrop-filter: blur(16px) saturate(160%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }
          .glass-btn-icon:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.15);
            color: var(--accent-primary);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.30);
          }
          .glass-btn-icon:active {
            transform: scale(0.93);
          }

          /* Large circular play button */
          .glass-btn-play {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 72px;
            height: 72px;
            background: rgba(16, 185, 129, 0.15);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border: 1px solid rgba(16, 185, 129, 0.40);
            border-radius: 50%;
            color: #34d399;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              0 8px 32px rgba(16, 185, 129, 0.30);
          }
          .glass-btn-play:hover {
            background: rgba(16, 185, 129, 0.25);
            border-color: rgba(16, 185, 129, 0.60);
            transform: scale(1.06);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.15),
              0 12px 40px rgba(16, 185, 129, 0.40);
          }
          .glass-btn-play:active {
            transform: scale(0.95);
          }
          .glass-btn-play:disabled {
            opacity: 0.30;
            cursor: not-allowed;
            transform: none;
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.08);
            box-shadow: none;
          }
          .glass-btn-play svg {
            width: 28px;
            height: 28px;
          }

          /* Liquid glass input field */
          .glass-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(12px) saturate(160%);
            -webkit-backdrop-filter: blur(12px) saturate(160%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 10px 16px;
            color: var(--text-primary);
            font-size: 14px;
            outline: none;
            transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
          }
          .glass-input::placeholder {
            color: var(--text-muted);
          }
          .glass-input:focus {
            border-color: rgba(16, 185, 129, 0.50);
            box-shadow:
              inset 0 2px 4px rgba(0, 0, 0, 0.15),
              0 0 0 3px rgba(16, 185, 129, 0.08);
          }

          /* Liquid glass toggle slider */
          .glass-toggle {
            position: relative;
            width: 44px;
            height: 24px;
            flex-shrink: 0;
          }
          .glass-toggle input {
            opacity: 0;
            width: 0;
            height: 0;
            position: absolute;
          }
          .glass-toggle-track {
            position: absolute;
            inset: 0;
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
            cursor: pointer;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.25);
          }
          .glass-toggle-track::before {
            content: '';
            position: absolute;
            width: 18px;
            height: 18px;
            left: 2px;
            bottom: 2px;
            background: linear-gradient(135deg, #e2e8f0, #94a3b8);
            border-radius: 50%;
            transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.30);
          }
          .glass-toggle input:checked + .glass-toggle-track {
            background: rgba(16, 185, 129, 0.25);
            border-color: rgba(16, 185, 129, 0.50);
          }
          .glass-toggle input:checked + .glass-toggle-track::before {
            transform: translateX(20px);
            background: linear-gradient(135deg, #34d399, #10b981);
            box-shadow:
              0 2px 6px rgba(0, 0, 0, 0.30),
              0 0 8px rgba(16, 185, 129, 0.50);
          }
          .glass-toggle input:disabled + .glass-toggle-track {
            opacity: 0.35;
            cursor: not-allowed;
          }

          /* Liquid glass badge / pill */
          .glass-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            background: rgba(16, 185, 129, 0.12);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(16, 185, 129, 0.25);
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: #34d399;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
          }

          /* Liquid glass modal overlay */
          .glass-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(16px) saturate(150%);
            -webkit-backdrop-filter: blur(16px) saturate(150%);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeInA3 0.3s ease;
          }
          .glass-modal {
            background: rgba(13, 13, 26, 0.92);
            backdrop-filter: blur(32px) saturate(180%);
            -webkit-backdrop-filter: blur(32px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.10);
            border-radius: 28px;
            padding: 36px 48px;
            max-width: 520px;
            width: 90%;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.10),
              0 24px 64px rgba(0, 0, 0, 0.60);
            animation: scaleInA3 0.35s cubic-bezier(0.32, 0.72, 0, 1);
          }

          /* Liquid glass progress bar */
          .glass-progress {
            width: 100%;
            height: 6px;
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-radius: 3px;
            overflow: hidden;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.25);
          }
          .glass-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #34d399);
            border-radius: 3px;
            transition: width 0.5s cubic-bezier(0.32, 0.72, 0, 1);
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.50);
          }

          /* Liquid glass list item */
          .glass-list-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 14px;
            transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
            margin-bottom: 8px;
          }
          .glass-list-item:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.10);
            transform: translateX(4px);
          }
          .glass-list-item.completed {
            background: rgba(16, 185, 129, 0.06);
            border-color: rgba(16, 185, 129, 0.15);
          }

          /* Liquid glass tooltip */
          .glass-tooltip {
            position: absolute;
            padding: 8px 14px;
            background: rgba(13, 13, 26, 0.95);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.10);
            border-radius: 10px;
            font-size: 13px;
            color: var(--text-primary);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.50);
            pointer-events: none;
            z-index: 9999;
            animation: fadeInA3 0.2s ease;
          }

          /* Inner shine animation for interactive elements */
          @keyframes glassShine {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .glass-shine::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: inherit;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.06) 50%,
              transparent 100%
            );
            background-size: 200% 100%;
            pointer-events: none;
            animation: glassShine 3s ease-in-out infinite;
          }
        `}</style>

        {/* Background: grain + ambient glows + organic blobs + grid */}
        <div className='bg-grain' />
        <div className='bg-ambient'>
          <div className='bg-grid' />
          <div className='glow-emerald' />
          <div className='glow-amber' />
          <div className='glow-emerald-2' />
        </div>
        <div className='bg-organic'>
          <div className='blob blob-1' />
          <div className='blob blob-2' />
          <div className='blob blob-3' />
          <div className='blob blob-4' />
        </div>

        {/* Sidebar */}
        <nav className='sidebar'>
          <div className='sidebar-logo' onClick={() => router.push('/action3/home')}>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'>
              <circle cx='12' cy='12' r='10' />
              <circle cx='12' cy='12' r='6' />
              <circle cx='12' cy='12' r='2' />
            </svg>
          </div>
          <button className='sidebar-item' onClick={() => router.push('/action3/home')} title='返回主界面'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' />
              <polyline points='9 22 9 12 15 12 15 22' />
            </svg>
          </button>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`sidebar-item ${currentPage === item.key ? 'active' : ''}`}
              onClick={() => router.push(item.href)}
              title={item.label}
            >
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d={item.icon} />
              </svg>
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <main className='main-content'>
          {children}
        </main>

        {/* Achievement Unlock Overlay */}
        {unlockData && (
          <div className='achievement-unlock-overlay'>
            <div className='achievement-unlock-card'>
              <div className='achievement-icon-wrap'>{unlockData.icon}</div>
              <div className='achievement-eyebrow'>成就解锁</div>
              <div className='achievement-name'>{unlockData.name}</div>
              <div className='achievement-desc'>{unlockData.description}</div>
              <button className='achievement-action' onClick={() => setUnlockData(null)}>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                  <polyline points='20 6 9 17 4 12' />
                </svg>
                太棒了!
              </button>
            </div>
          </div>
        )}

        {/* Recent Unlock Banner */}
        {showBanner && bannerData && !unlockData && (
          <div className='recent-unlock-banner'>
            <div className='banner-icon'>
              <svg viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2'>
                <circle cx='12' cy='8' r='6' />
                <path d='M15.477 12.89L17 22l-5-3-5 3 1.523-9.11' />
              </svg>
            </div>
            <span>新成就解锁:</span>
            <span style={{ fontWeight: 700 }}>{bannerData.name}</span>
            <button className='banner-close' onClick={() => setShowBanner(false)}>
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                <line x1='18' y1='6' x2='6' y2='18' />
                <line x1='6' y1='6' x2='18' y2='18' />
              </svg>
            </button>
          </div>
        )}
      </div>
    </UnlockContext.Provider>
  );
}
