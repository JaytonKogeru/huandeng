import markUrl from '../favicon.svg?url';
import { cn } from '../lib/utils';

export function HuandengMark({ className }: { className?: string }) {
  return (
    <img
      src={markUrl}
      alt=""
      width={28}
      height={28}
      draggable={false}
      className={cn('size-7 shrink-0 select-none', className)}
      data-hd-brand
    />
  );
}
