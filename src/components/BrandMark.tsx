export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="18.5" stroke="currentColor" strokeOpacity=".38" strokeWidth=".7" />
      <path d="M12 17.5 24 11l12 6.5H12Z" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M14.5 20h19M16 34h16M18 20v12m6-12v12m6-12v12M14 36h20" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M20 17.5c.7-2 1.8-3.2 4-4 2.2.8 3.3 2 4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}
