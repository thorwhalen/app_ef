/**
 * NoticeBar — a corner toast for the store's transient `notice`.
 */
import { useEffect } from 'react';
import { useAppStore } from '@/state/store';
import { cn } from '@/lib/utils';

export function NoticeBar() {
  const notice = useAppStore((s) => s.notice);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(
      () => useAppStore.setState({ notice: null }),
      6000,
    );
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg',
        notice.kind === 'error'
          ? 'border-destructive bg-destructive text-destructive-foreground'
          : 'border-border bg-card text-card-foreground',
      )}
      role="status"
    >
      {notice.message}
    </div>
  );
}
