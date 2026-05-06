import { cn } from '@/lib/utils';
import * as React from 'react';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white shadow-sm transition-shadow placeholder:text-white/30 focus-visible:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50',
        type === 'search' &&
          '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
