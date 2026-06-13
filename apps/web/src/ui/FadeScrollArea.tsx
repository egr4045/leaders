import { type ReactNode } from 'react';

export function FadeScrollArea({
  children,
  className = '',
  maxHeight = '40dvh',
}: {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {children}
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-950 to-transparent" />
    </div>
  );
}
