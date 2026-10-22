/** Car stays in place — road + wheels animate to show motion. */
export function RunningCar({ className = '' }: { className?: string }) {
  return (
    <div className={`login-car-stage ${className}`} aria-hidden="true">
      {/* scrolling road */}
      <div className="login-car-road">
        <div className="login-car-road-line" />
      </div>

      {/* speed lines */}
      <div className="login-car-speed">
        <span />
        <span />
        <span />
      </div>

      <div className="login-car-body">
        <svg viewBox="0 0 220 90" className="login-car-svg" fill="none">
          {/* chassis shadow */}
          <ellipse cx="110" cy="78" rx="72" ry="5" fill="rgba(0,0,0,0.28)" className="login-car-shadow" />

          {/* body */}
          <path
            d="M38 58 L52 36 C56 30 62 28 78 28 L118 28 C132 28 142 32 150 40 L176 58 L196 58 C202 58 206 62 206 66 L206 70 C206 74 202 76 198 76 L178 76 L42 76 C36 76 32 72 32 68 L32 64 C32 60 34 58 38 58Z"
            fill="rgba(255,255,255,0.94)"
          />
          {/* cabin glass */}
          <path
            d="M78 32 L116 32 C128 32 136 36 142 42 L156 56 L68 56 L78 32Z"
            fill="rgba(26,115,232,0.55)"
          />
          {/* accent stripe */}
          <path d="M48 58 H188" stroke="#1a73e8" strokeWidth="2.5" strokeLinecap="round" />
          {/* headlights */}
          <rect x="192" y="60" width="10" height="6" rx="2" fill="#fff1c9" />
          {/* rear light */}
          <rect x="34" y="60" width="7" height="6" rx="2" fill="#f87171" />

          {/* wheels */}
          <g className="login-car-wheel login-car-wheel--back">
            <circle cx="68" cy="74" r="12" fill="#1e242c" />
            <circle cx="68" cy="74" r="6" fill="#576579" />
            <path d="M68 64 V84 M58 74 H78" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          </g>
          <g className="login-car-wheel login-car-wheel--front">
            <circle cx="162" cy="74" r="12" fill="#1e242c" />
            <circle cx="162" cy="74" r="6" fill="#576579" />
            <path d="M162 64 V84 M152 74 H172" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}
