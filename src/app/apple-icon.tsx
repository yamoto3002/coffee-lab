import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0908', borderRadius: 38 }}>
        <div style={{ width: 116, height: 116, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '18px solid #33271F', borderTopColor: '#DCA66C', borderLeftColor: '#C76F91', borderBottomColor: '#69CBD5', borderRadius: 58, transform: 'rotate(18deg)' }}>
          <div style={{ width: 34, height: 50, display: 'flex', borderRadius: '55% 45% 55% 45%', background: '#DCA66C', transform: 'rotate(18deg)' }} />
        </div>
      </div>
    ),
    size,
  );
}
