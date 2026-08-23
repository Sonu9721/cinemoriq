import Image from 'next/image';
import { cx } from '../ui/primitives';

export function CinemoriqMark({ className }: { className?: string }) {
  return (
    <span className={cx('brand-mark', className)} aria-hidden="true">
      <Image
        className="brand-mark__image"
        src="/brand/cinemoriq-mark.webp"
        alt=""
        fill
        priority
        sizes="48px"
      />
    </span>
  );
}
