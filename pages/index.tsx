import * as React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/action3');
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0f0f0f',
      color: '#fff',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '18px',
    }}>
      正在跳转到 Action PRO...
    </div>
  );
}
