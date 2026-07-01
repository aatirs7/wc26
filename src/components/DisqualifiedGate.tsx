import { Ban } from 'lucide-react';

// Full-screen, non-dismissible overlay shown to a disqualified player. It sits
// above everything (including the nav and tab bar) and swallows all pointer
// input, so the app behind stays visible but blurred and untouchable. Purely
// presentational and server-rendered; there is no way to close it from the UI.
// Controlled by src/lib/disqualified.ts (empty that list to lift it).
export default function DisqualifiedGate() {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Disqualified"
      className="fixed inset-0 z-[2000] flex touch-none select-none flex-col items-center justify-center gap-5 px-7 text-center"
      style={{
        backgroundColor: 'rgba(122, 8, 12, 0.9)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
      }}
    >
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(220, 38, 38, 0.35)', border: '4px solid #fca5a5' }}
      >
        <Ban className="h-14 w-14" strokeWidth={2.5} style={{ color: '#fee2e2' }} />
      </div>

      <p
        className="text-[0.7rem] font-black uppercase tracking-[0.35em]"
        style={{ color: '#fecaca' }}
      >
        Siddiqui World Cup
      </p>

      <h1 className="font-display text-6xl leading-none sm:text-7xl" style={{ color: '#fff1f1' }}>
        Disqualified
      </h1>

      <p
        className="max-w-sm text-base font-semibold leading-relaxed"
        style={{ color: '#ffe4e4' }}
      >
        For unsportsmanlike conduct and cheating, you have been disqualified from the Siddiqui World
        Cup.
      </p>
      <p className="max-w-sm text-sm" style={{ color: 'rgba(255, 220, 220, 0.8)' }}>
        Your account is suspended. You can no longer take part or view the competition.
      </p>
    </div>
  );
}
