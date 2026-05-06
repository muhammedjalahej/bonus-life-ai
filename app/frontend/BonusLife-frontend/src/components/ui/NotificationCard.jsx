import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Check, Send, Trash2 } from 'lucide-react';

const NotificationCard = React.forwardRef(
  (
    {
      className,
      avatarSrc,
      avatarFallback,
      isOnline = false,
      userName,
      userRole,
      message,
      timestamp,
      readStatus = 'Unread',
      onDelete,
      onReply,
      onClick,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'w-full overflow-hidden rounded-2xl p-3 cursor-pointer transition-all duration-200',
          'border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1]',
          'backdrop-blur-sm',
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">

          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={userName} />}
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-[#080810] bg-emerald-400" />
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Name + role */}
            <p className={cn('text-sm font-semibold leading-tight mb-0.5', readStatus === 'Unread' ? 'text-white' : 'text-white/50')}>
              {userName}
            </p>
            {userRole && (
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/30 mb-2">{userRole}</p>
            )}

            {/* Message bubble */}
            <div
              className="rounded-lg rounded-tl-none px-3 py-2 text-xs text-white/40 leading-relaxed mb-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="line-clamp-2">{message}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-1.5 text-[10px] text-white/25">
              <span>{timestamp}</span>
              <span>&middot;</span>
              {readStatus === 'Read' ? (
                <>
                  <span>Read</span>
                  <Check className="w-3 h-3" />
                </>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 inline-block" />
                  Unread
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 shrink-0">
            {onReply && (
              <button
                onClick={(e) => { e.stopPropagation(); onReply(); }}
                className="p-1.5 rounded-lg text-white/20 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                aria-label="Reply"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(e); }}
                className="p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                aria-label="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
NotificationCard.displayName = 'NotificationCard';

export { NotificationCard };
