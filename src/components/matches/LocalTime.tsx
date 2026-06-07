'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// Renders a kickoff in the viewer's local time. The server snapshot is a
// stable UTC string, upgraded to the locale format on the client without
// a hydration mismatch.
export default function LocalTime({ iso, withDate }: { iso: string; withDate?: boolean }) {
  const text = useSyncExternalStore(
    subscribe,
    () => {
      const d = new Date(iso);
      return withDate
        ? d.toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    },
    () => `${iso.slice(11, 16)} UTC`,
  );

  return <span suppressHydrationWarning>{text}</span>;
}
