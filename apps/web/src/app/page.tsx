'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    router.push('/home');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#020617',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#94a3b8',
      fontFamily: 'sans-serif'
    }}>
      <p>Redirecting to Matchflow Home...</p>
    </div>
  );
}
