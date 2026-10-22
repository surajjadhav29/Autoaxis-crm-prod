interface LoginBrandMarkProps {
  className?: string;
  /** Larger mark for the left branding panel */
  size?: 'default' | 'large';
  /** Show company tagline under the logo */
  showTagline?: boolean;
  taglineClassName?: string;
}

export function LoginBrandMark({
  className = '',
  size = 'default',
  showTagline = false,
  taglineClassName = '',
}: LoginBrandMarkProps) {
  const imgClass =
    size === 'large'
      ? 'h-16 w-auto max-w-[300px] sm:h-[72px] xl:h-20 xl:max-w-[340px]'
      : 'h-12 w-auto max-w-[240px] sm:h-14';

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      <img
        src="/autoaxis-logo.png"
        alt="AutoAxis Solution"
        className={`block object-contain object-left ${imgClass}`}
      />
      {showTagline ? (
        <p
          className={`m-0 text-[13px] font-medium leading-5 tracking-[0.02em] text-[#3d4654] sm:text-[14px] ${taglineClassName}`}
        >
          Where Vehicles Meet compliance
        </p>
      ) : null}
    </div>
  );
}
