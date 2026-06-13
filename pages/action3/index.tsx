import * as React from 'react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Action3Index() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/action3/goals');
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      正在加载 Action PRO...
    </div>
  );
}
