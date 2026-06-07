import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

// Trophy on a pitch-emerald square. Generated at build via next/og, so no
// binary asset and no Vercel default favicon.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0c3a2b, #06140f)',
          fontSize: 40,
        }}
      >
        🏆
      </div>
    ),
    { ...size, emoji: 'twemoji' },
  );
}
