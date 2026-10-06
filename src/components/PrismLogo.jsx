export default function PrismLogo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="prism-face" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0055aa" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="prism-side" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7B4FE8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0a0f2c" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <polygon points="50,8 88,75 12,75" fill="url(#prism-face)" stroke="#00D4FF" strokeWidth="1.5" />
      <polygon points="50,8 88,75 50,85" fill="url(#prism-side)" stroke="#7B4FE8" strokeWidth="1" />
      <line x1="12" y1="75" x2="4" y2="62" stroke="#FFB627" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <line x1="12" y1="75" x2="3" y2="75" stroke="#00E5A0" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <line x1="12" y1="75" x2="4" y2="88" stroke="#7B4FE8" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <circle cx="50" cy="8" r="3" fill="#00D4FF" opacity="0.8" />
    </svg>
  );
}
