'use client';

import * as React from 'react';
import { useState } from 'react';
import { useAction3YoutubeAnalyze } from '~/common/action3/api-hooks';

interface YoutubeSummaryModalProps {
  url: string;
  goalTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function YoutubeSummaryModal({ url, goalTitle, isOpen, onClose }: YoutubeSummaryModalProps) {
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string;
    keyConcepts: string[];
    chunks: Array<{ start: number; end: number; text: string }>;
    available: boolean;
    error?: string;
  } | null>(null);

  const analyze = useAction3YoutubeAnalyze(url, goalTitle);

  React.useEffect(() => {
    if (isOpen && !analysisResult && !analyze.isPending) {
      analyze.mutate();
    }
  }, [isOpen, analysisResult, analyze]);

  React.useEffect(() => {
    if (analyze.data) {
      setAnalysisResult(analyze.data as typeof analysisResult);
    }
  }, [analyze.data]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const videoId = extractVideoId(url);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '24px', padding: '32px',
        maxWidth: '680px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
                <path d="M23 7l-7 5 7 5V7zM14 5H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                视频摘要
              </h2>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#ef4444', textDecoration: 'none' }}
              >
                在 YouTube 观看
              </a>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--bg-elevated)', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Loading */}
        {analyze.isPending && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              border: '3px solid rgba(99,102,241,0.2)',
              borderTopColor: '#6366f1',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>正在提取字幕并生成摘要...</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>使用 Invidious 无需代理</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error */}
        {analyze.isError && (
          <div style={{
            textAlign: 'center', padding: '40px',
            background: 'rgba(239,68,68,0.08)', borderRadius: '16px',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p style={{ fontSize: '14px', color: '#ef4444', marginBottom: '8px' }}>无法获取字幕</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {analyze.error?.message || '该视频可能没有字幕或不支持提取'}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.15)', border: 'none',
                color: '#ef4444', fontSize: '13px', fontWeight: 600,
                textDecoration: 'none', cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2v-7V5a2 2 0 00-2-2h-2v2h2v14z" />
              </svg>
              前往 YouTube 观看
            </a>
          </div>
        )}

        {/* Result */}
        {analysisResult && !analyze.isPending && (
          <div>
            {analysisResult.available ? (
              <>
                {/* AI Summary */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#818cf8', marginBottom: '10px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    AI 摘要
                  </h3>
                  <div style={{
                    background: 'rgba(99,102,241,0.08)', borderRadius: '12px', padding: '16px',
                    border: '1px solid rgba(99,102,241,0.15)',
                  }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                      {analysisResult.summary}
                    </p>
                  </div>
                </div>

                {/* Key Concepts */}
                {analysisResult.keyConcepts.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      关键概念
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {analysisResult.keyConcepts.map((concept, i) => (
                        <span key={i} style={{
                          fontSize: '12px', padding: '5px 12px', borderRadius: '999px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: 'var(--text-primary)',
                        }}>
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Chapters */}
                {analysisResult.chunks.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      内容分段
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {analysisResult.chunks.map((chunk, i) => (
                        <a
                          key={i}
                          href={`https://youtu.be/${videoId}?t=${Math.floor(chunk.start)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: '12px',
                            padding: '12px', borderRadius: '10px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                            (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.05)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)';
                            (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                          }}
                        >
                          <span style={{
                            fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                            background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                            fontWeight: 600, flexShrink: 0, marginTop: '2px',
                          }}>
                            {formatTime(chunk.start)}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {chunk.text}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                textAlign: 'center', padding: '40px',
                background: 'rgba(239,68,68,0.05)', borderRadius: '16px',
                border: '1px solid rgba(239,68,68,0.1)',
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.6 }}>
                  <path d="M1 1l22 22M16.41 4.59a2 2 0 00-2.83 0L10 8.59V4h4.59l3.82-3.82a2 2 0 000-2.83L16.41 4.59zM5 12H3v7a2 2 0 002 2h14a2 2 0 002-2v-7H14" />
                </svg>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {analysisResult.error || '字幕不可用'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  该视频可能没有字幕或字幕被禁用。建议前往 YouTube 观看原视频。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return '';
}
