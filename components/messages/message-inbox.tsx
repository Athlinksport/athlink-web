import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";

import type { InboxConversation } from "@/lib/messages/get-message-inbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

type MessageInboxProps = {
  conversations: InboxConversation[];
  currentUserId: string;
};

function formatMessageTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

export function MessageInbox({
  conversations,
  currentUserId,
}: MessageInboxProps) {
  if (conversations.length === 0) {
    return (
      <Surface variant="glass">
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="Connect with another athlete to start a conversation."
        />
      </Surface>
    );
  }

  return (
    <Surface variant="glass" className="overflow-hidden">
      <ul className="divide-y divide-border">
        {conversations.map((conversation) => {
          const name =
            conversation.participant?.displayName || "Athlink member";
          const lastMessage = conversation.lastMessage;
          const isUnread = conversation.unreadCount > 0;
          const preview = lastMessage
            ? `${lastMessage.senderId === currentUserId ? "You: " : ""}${lastMessage.content}`
            : "No messages yet";

          return (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                aria-label={`Open conversation with ${name}${
                  isUnread
                    ? `, ${conversation.unreadCount} unread messages`
                    : ""
                }`}
                className="group flex min-h-20 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-5 sm:py-4"
              >
                <Avatar
                  size="lg"
                  className="size-12 bg-muted sm:size-13"
                >
                  {conversation.participant?.avatarUrl && (
                    <AvatarImage
                      src={conversation.participant.avatarUrl}
                      alt=""
                    />
                  )}
                  <AvatarFallback className="font-semibold text-primary">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2
                      className={cn(
                        "truncate text-sm text-foreground sm:text-base",
                        isUnread ? "font-bold" : "font-semibold",
                      )}
                    >
                      {name}
                    </h2>
                    {lastMessage && (
                      <time
                        dateTime={lastMessage.createdAt}
                        className="shrink-0 text-xs text-muted-foreground"
                      >
                        {formatMessageTime(lastMessage.createdAt)}
                      </time>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-3">
                    <p
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        isUnread
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {preview}
                    </p>
                    {isUnread && (
                      <span
                        aria-hidden="true"
                        className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] leading-none font-bold text-primary-foreground"
                      >
                        {conversation.unreadCount > 99
                          ? "99+"
                          : conversation.unreadCount}
                      </span>
                    )}
                    <ChevronRight
                      aria-hidden="true"
                      className="hidden size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
                    />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}

export function MessageInboxLoading() {
  return (
    <Surface
      variant="glass"
      aria-label="Loading conversations"
      aria-busy="true"
      className="overflow-hidden"
    >
      <div className="divide-y divide-border">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-20 animate-pulse items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4"
          >
            <div className="size-12 shrink-0 rounded-full bg-muted sm:size-13" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="mt-2 h-3.5 w-3/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
