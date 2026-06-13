'use client';
import * as React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function Action3Landing() {
  const router = useRouter();

  const features = [
    {
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      title: 'AI 智能规划',
      desc: '输入目标，AI 自动拆解里程碑与每日任务，匹配最佳学习路径',
      color: '#10b981',
    },
    {
      icon: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
      title: '智能日历',
      desc: '可视化学习进度，自动排布任务到日历，专注今日最重要的事',
      color: '#3b82f6',
    },
    {
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      title: '进度测验',
      desc: '里程碑完成后通过 Quiz 验证掌握程度，巩固知识不留死角',
      color: '#8b5cf6',
    },
    {
      icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
      title: '成就系统',
      desc: '完成任务解锁成就，积累 XP 与徽章，学习更有动力',
      color: '#f59e0b',
    },
    {
      icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
      title: '语音播报',
      desc: 'TTS 语音朗读任务与内容，支持中文、英文、日文、韩文',
      color: '#ef4444',
    },
    {
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      title: '学习资源',
      desc: 'AI 智能推荐 YouTube 视频与文章摘要，高效获取优质内容',
      color: '#06b6d4',
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
      color: 'var(--text-primary)',
      overflow: 'auto',
    }}>
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dash {
          to { stroke-dashoffset: 0; }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .landing-hero { animation: fadeInUp 0.8s ease forwards; }
        .landing-badge { animation: fadeInUp 0.8s ease 0.1s forwards; opacity: 0; }
        .landing-title { animation: fadeInUp 0.8s ease 0.2s forwards; opacity: 0; }
        .landing-subtitle { animation: fadeInUp 0.8s ease 0.35s forwards; opacity: 0; }
        .landing-cta { animation: fadeInUp 0.8s ease 0.5s forwards; opacity: 0; }
        .landing-features { animation: fadeInUp 0.8s ease 0.6s forwards; opacity: 0; }
        .feature-card {
          opacity: 0;
          animation: fadeInUp 0.6s ease forwards;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .feature-card:hover {
          transform: translateY(-6px);
          border-color: rgba(255,255,255,0.15);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .cta-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cta-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 200% 100%;
          animation: shimmer 2.5s ease-in-out infinite;
        }
        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.15);
        }
        .ghost-btn:hover {
          border-color: rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.05);
          transform: translateY(-1px);
        }
      ` }} />

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute', top: '15%', left: '10%',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '8%',
          width: '350px', height: '350px',
          background: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 10s ease-in-out infinite reverse',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '25%',
          width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          animation: 'float 12s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Logo mark */}
        <div style={{
          marginBottom: '32px',
          position: 'relative',
        }}>
          <div style={{
            width: '72px', height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(16,185,129,0.3), 0 0 60px rgba(16,185,129,0.1)',
            animation: 'float 6s ease-in-out infinite',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          {/* Pulse ring */}
          <div style={{
            position: 'absolute', top: '-8px', left: '-8px', right: '-8px', bottom: '-8px',
            borderRadius: '28px',
            border: '1px solid rgba(16,185,129,0.3)',
            animation: 'pulse-ring 3s ease-out infinite',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Badge */}
        <div className='landing-badge' style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 20px',
          borderRadius: '100px',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#10b981',
          fontWeight: 600,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981">
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
            <polyline points="13 2 13 9 20 9" stroke="white" strokeWidth="2" fill="none" />
          </svg>
          AI 驱动 · 本地优先 · 隐私安全
        </div>

        {/* Title */}
        <h1 className='landing-title' style={{
          fontSize: 'clamp(40px, 8vw, 72px)',
          fontWeight: 800,
          lineHeight: 1.1,
          textAlign: 'center',
          marginBottom: '24px',
          letterSpacing: '-0.03em',
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 40%, #fbbf24 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradient-shift 4s ease infinite',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Action
          </span>
          <span style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #a0a0b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            3
          </span>
          <br />
          <span style={{ color: 'var(--text-primary)' }}>学习目标管理</span>
        </h1>

        {/* Subtitle */}
        <p className='landing-subtitle' style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          maxWidth: '560px',
          lineHeight: 1.6,
          marginBottom: '40px',
          fontWeight: 400,
        }}>
          输入目标，AI 智能拆解里程碑与每日任务
          <br />
          搭配 Quiz 测验、成就系统与语音播报
          <br />
          让每一步学习都有迹可循
        </p>

        {/* CTA */}
        <div className='landing-cta' style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className='cta-btn'
            onClick={() => router.push('/action3/home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '16px 40px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            立即开始
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <button
            className='ghost-btn'
            onClick={() => router.push('/action3/home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 32px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: 'var(--text-secondary)',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            查看 Demo
          </button>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-muted)',
          fontSize: '12px',
          animation: 'blink 2s ease infinite',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '80px 24px 120px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '60px',
        }}>
          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '16px',
            letterSpacing: '-0.02em',
          }}>
            全栈学习加速器
          </h2>
          <p style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            从目标设定到知识验证，一站式覆盖学习全流程
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className='feature-card'
              style={{
                animationDelay: `${0.7 + i * 0.1}s`,
                padding: '28px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: `${feature.color}15`,
                border: `1px solid ${feature.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={feature.color} strokeWidth="1.8">
                  <path d={feature.icon} />
                </svg>
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{
        padding: '40px 24px 80px',
        textAlign: 'center',
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '48px 40px',
          borderRadius: '24px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.3) 50%, transparent 100%)',
          }} />
          <h2 style={{
            fontSize: '28px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}>
            准备好开始了吗？
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            marginBottom: '32px',
          }}>
            你的第一个 AI 规划目标，等你创建
          </p>
          <button
            className='cta-btn'
            onClick={() => router.push('/action3/home')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 36px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            进入 Action3
          </button>
        </div>
      </section>
    </div>
  );
}
