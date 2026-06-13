'use client';
import * as React from 'react';
import { useRouter } from 'next/router';

interface BackButtonProps {
  href?: string;
  label?: string;
}

export function BackButton({ href = '/action3/goals', label = '返回' }: BackButtonProps) {
  const router = useRouter();
  const handleBack = () => {
    if (href.startsWith('/')) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        color: 'var(--text-secondary)',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: '24px',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(37,99,235,0.15)';
        e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)';
        e.currentTarget.style.color = 'var(--accent-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-elevated)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M15 18l-6-6 6-6' />
      </svg>
      {label}
    </button>
  );
}
