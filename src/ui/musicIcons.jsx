export const IconPlay = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
)

export const IconPause = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="7" y="5" width="3.6" height="14" rx="1.2" />
    <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" />
  </svg>
)

export const IconPrev = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M18 5.5v13L9 12l9-6.5Z" />
    <rect x="5" y="5.5" width="2.4" height="13" rx="1" />
  </svg>
)

export const IconNext = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M6 5.5v13L15 12 6 5.5Z" />
    <rect x="16.6" y="5.5" width="2.4" height="13" rx="1" />
  </svg>
)

export const IconLoop = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M4 9a5 5 0 0 1 5-5h9m0 0-3-3m3 3-3 3M20 15a5 5 0 0 1-5 5H6m0 0 3 3m-3-3 3-3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const IconNote = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M9 18V6l10-2v12"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="6.5" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="16.5" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)
