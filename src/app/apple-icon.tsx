import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Home-screen icon for iOS/Android installs.
export default function AppleIcon() {
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
          fontSize: 110,
        }}
      >
        🏆
      </div>
    ),
    { ...size, emoji: 'twemoji' },
  );
}
