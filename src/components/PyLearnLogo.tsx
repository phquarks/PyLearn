import logoFull from '../assets/logo-full.webp';
import logoMark from '../assets/logo-mark.webp';

type PyLearnLogoProps = {
  /** rendered height in px; width follows the artwork's aspect ratio */
  height?: number;
  /** full lockup (mark above the wordmark) when true, bare mark when false */
  withWordmark?: boolean;
  className?: string;
};

export function PyLearnLogo({ height = 72, withWordmark = true, className }: PyLearnLogoProps) {
  return (
    <img
      alt="PyLearn"
      className={['pylearn-logo', className].filter(Boolean).join(' ')}
      height={height}
      src={withWordmark ? logoFull : logoMark}
      style={{ height }}
    />
  );
}
