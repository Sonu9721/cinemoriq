import { cx } from '../ui/primitives';

export function CinemoriqMark({ className }: { className?: string }) {
  return (
    <span className={cx('brand-mark', className)} aria-hidden="true">
      <span className="brand-mark__c">C</span>
      <span className="brand-mark__spark">◆</span>
    </span>
  );
}
