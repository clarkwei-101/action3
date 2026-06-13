'use client';
import * as React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Action3Landing() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the standalone landing page with full visual design
    router.replace('/landing-action3.html');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F0F14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>跳转中...</p>
      </div>
    </div>
  );
}
