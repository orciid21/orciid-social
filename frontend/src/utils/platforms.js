import facebook from '../assets/platforms/facebook.svg';
import instagram from '../assets/platforms/instagram.svg';
import twitter from '../assets/platforms/twitter.svg';
import linkedin from '../assets/platforms/linkedin.svg';
import tiktok from '../assets/platforms/tiktok.svg';
import threads from '../assets/platforms/threads.svg';
import youtube from '../assets/platforms/youtube.svg';

// Single source of truth for platform branding. These are the platforms' own
// logo set (src/assets/platforms/) — the official brand marks, drawn as SVG
// tiles so they stay sharp at any size. Use these everywhere instead of ad-hoc
// colored circles / emoji so the whole app stays consistent.
export const PLATFORM_LOGOS = {
  FACEBOOK: facebook,
  INSTAGRAM: instagram,
  TWITTER: twitter,
  LINKEDIN: linkedin,
  TIKTOK: tiktok,
  THREADS: threads,
  YOUTUBE: youtube,
};

export const PLATFORM_META = {
  FACEBOOK: { label: 'Facebook', bg: '#1877F2', logo: facebook },
  INSTAGRAM: { label: 'Instagram', bg: '#E1306C', logo: instagram },
  TWITTER: { label: 'Twitter/X', bg: '#000000', logo: twitter },
  LINKEDIN: { label: 'LinkedIn', bg: '#0A66C2', logo: linkedin },
  TIKTOK: { label: 'TikTok', bg: '#000000', logo: tiktok },
  THREADS: { label: 'Threads', bg: '#000000', logo: threads },
  YOUTUBE: { label: 'YouTube', bg: '#FF0000', logo: youtube },
};
