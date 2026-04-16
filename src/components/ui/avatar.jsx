import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Avatar = forwardRef(function Avatar({ className, ...props }, ref) {
  return (
    <span
      ref={ref}
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/10',
        className,
      )}
      {...props}
    />
  );
});

const AvatarImage = forwardRef(function AvatarImage({ className, alt, ...props }, ref) {
  return (
    <img
      ref={ref}
      alt={alt}
      className={cn('h-full w-full object-cover', className)}
      {...props}
    />
  );
});

function AvatarFallback({ className, children, ...props }) {
  return (
    <span
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-bold text-white',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { Avatar, AvatarImage, AvatarFallback };