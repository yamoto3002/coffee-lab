import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090B0D', borderRadius: 38 }}>
        <div style={{ width: 116, height: 116, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '18px solid #2A3135', borderTopColor: '#65DCE8', borderLeftColor: '#C65B91', borderBottomColor: '#D49A57', borderRadius: 34, transform: 'rotate(18deg)' }}>
          <div style={{ width: 32, height: 48, display: 'flex', borderRadius: '55% 45% 55% 45%', background: '#E9EEF0', transform: 'rotate(18deg)' }} />
        </div>
      </div>
    ),
    size,
  );
}
