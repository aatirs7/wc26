'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Refreshes the server-rendered page every ~30s while matches are live.
// All reads hit Neon, never the results provider.
export default function LivePoller({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [active, router]);

  return null;
}
