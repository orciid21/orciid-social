import { useState } from 'react';
import { PLATFORM_META, PLATFORM_LOGOS } from '../utils/platforms';

// Channel avatar with a platform-logo badge in the corner. Facebook CDN avatar
// URLs expire after a while, so a failed image load falls back to a colored
// initial instead of the browser's broken-image icon.
export default function ChannelAvatar({
  account,
  size = 'w-10 h-10',
  badge = 'w-4 h-4',
  rounded = 'rounded-lg',
}) {
  const [broken, setBroken] = useState(false);
  const meta = PLATFORM_META[account.platform] || {};
  const logo = PLATFORM_LOGOS[account.platform];
  const showAvatar = account.avatar && !broken;

  return (
    <div className={`relative ${size} flex-shrink-0`}>
      {showAvatar ? (
        <img
          src={account.avatar}
          alt={account.name}
          onError={() => setBroken(true)}
          className={`w-full h-full ${rounded} object-cover`}
        />
      ) : (
        <div
          className={`w-full h-full ${rounded} flex items-center justify-center text-white font-bold text-xs`}
          style={{ backgroundColor: meta.bg || '#888' }}
        >
          {(account.name || '?').charAt(0).toUpperCase()}
        </div>
      )}
      {logo && (
        <img
          src={logo}
          alt={meta.label || account.platform}
          className={`absolute -bottom-1 -right-1 ${badge} rounded-full border border-white bg-white object-cover`}
        />
      )}
    </div>
  );
}
