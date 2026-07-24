import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MessagesButtonProps = {
  unreadCount: number;
  onNavigate?: () => void;
};

export function MessagesButton({
  unreadCount,
  onNavigate,
}: MessagesButtonProps) {
  const label =
    unreadCount > 0
      ? `Messages, ${unreadCount} unread`
      : "Messages";

  return (
    <Link
      href="/messages"
      aria-label={label}
      onClick={onNavigate}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-sm" }),
        "relative",
      )}
    >
      <MessageCircle aria-hidden="true" className="size-4" />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full border border-background bg-primary px-1 text-[10px] leading-3.5 font-bold text-primary-foreground"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
