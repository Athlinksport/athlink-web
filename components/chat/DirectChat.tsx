"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Clock3,
  Heart,
  LoaderCircle,
  MapPin,
  PawPrint,
  Send,
  Smile,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  conversation_id?: string;
};

export type ConversationUser = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  city_name: string | null;
};

type ConversationHeaderProps = {
  otherUser: ConversationUser | null;
};

export function ConversationHeader({ otherUser }: ConversationHeaderProps) {
  const name = otherUser?.display_name || "Athlink member";

  return (
    <header className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950/85 px-3 py-3 backdrop-blur-xl sm:px-5">
      <Link
        href="/connections"
        aria-label="Back to connections"
        className={buttonVariants({
          variant: "ghost",
          size: "icon",
          className: "text-slate-300 hover:bg-white/10 hover:text-white",
        })}
      >
        <ArrowLeft className="size-4" />
      </Link>

      <Avatar size="lg" className="size-11 bg-slate-800">
        {otherUser?.avatar_url && (
          <AvatarImage src={otherUser.avatar_url} alt={name} />
        )}
        <AvatarFallback className="bg-slate-800 font-semibold text-lime-400">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold text-white sm:text-base">
          {name}
        </h1>
        {otherUser?.city_name && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="size-3" aria-hidden="true" />
            <span className="truncate">{otherUser.city_name}</span>
          </p>
        )}
      </div>
    </header>
  );
}

type MessageBubbleProps = {
  message: ChatMessage;
  isMine: boolean;
};

export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn("flex", isMine ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[72%]",
          isMine
            ? "rounded-br-md bg-lime-400 text-slate-950"
            : "rounded-bl-md border border-white/5 bg-slate-800 text-slate-100",
        )}
      >
        <p className="whitespace-pre-wrap break-words text-[15px] leading-5">
          {message.content}
        </p>
        <time
          dateTime={message.created_at}
          className={cn(
            "mt-1 block text-right text-[10px] leading-none",
            isMine ? "text-slate-700" : "text-slate-500",
          )}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </motion.div>
  );
}

type MessageListProps = {
  messages: ChatMessage[];
  currentUserId: string;
  isLoading: boolean;
};

export function MessageList({
  messages,
  currentUserId,
  isLoading,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isLoading, messages]);

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,rgba(163,230,53,0.04),transparent_40%)] px-3 py-4 sm:px-5"
      aria-live="polite"
      aria-busy={isLoading}
    >
      {isLoading ? (
        <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Loading messages...
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lime-400">
            <Send className="size-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-300">No messages yet</p>
          <p className="mt-1 text-xs text-slate-500">Send a message to start the conversation.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={message.sender_id === currentUserId}
            />
          ))}
        </div>
      )}
      <div ref={endRef} aria-hidden="true" />
    </div>
  );
}

const emojiCategories = [
  {
    id: "recent",
    name: "Recent",
    Icon: Clock3,
    emojis: ["😊", "😂", "❤️", "🔥", "👍", "🥰", "😭", "🎉"],
  },
  {
    id: "smileys",
    name: "Smileys",
    Icon: Smile,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃",
      "😉", "😍", "🥰", "😘", "😋", "😜", "🤪", "🤗", "🤔", "🫡", "😎", "🥳",
    ],
  },
  {
    id: "animals",
    name: "Animals",
    Icon: PawPrint,
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐧"],
  },
  {
    id: "sports",
    name: "Sports",
    Icon: Trophy,
    emojis: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🥏", "🎱", "🏓", "🏸", "🥊", "🥋", "⛳", "🏹", "🏋️"],
  },
  {
    id: "hearts",
    name: "Hearts",
    Icon: Heart,
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "💕", "💞", "💓", "💗", "💖", "💘"],
  },
] as const;

type EmojiPickerPopoverProps = {
  isOpen: boolean;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
};

export function EmojiPickerPopover({
  isOpen,
  selectedCategory,
  onCategoryChange,
  onEmojiSelect,
  onClose,
  containerRef,
}: EmojiPickerPopoverProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) onClose();
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, isOpen, onClose]);

  const activeCategory =
    emojiCategories.find((category) => category.id === selectedCategory) ??
    emojiCategories[1];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="absolute inset-x-0 bottom-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-white/15 bg-slate-800/80 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:left-0 sm:right-auto sm:w-[26rem]"
          role="dialog"
          aria-label="Emoji picker"
        >
          <div className="flex items-center gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Emoji categories">
            {emojiCategories.map(({ id, name, Icon }) => {
              const selected = id === activeCategory.id;
              return (
                <Button
                  key={id}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  role="tab"
                  aria-label={name}
                  aria-selected={selected}
                  onClick={() => onCategoryChange(id)}
                  className={cn(
                    "rounded-xl text-slate-400 hover:bg-white/10 hover:text-white",
                    selected && "bg-white/10 text-lime-400",
                  )}
                >
                  <Icon />
                </Button>
              );
            })}
          </div>
          <Separator className="bg-white/10" />
          <div className="overflow-x-auto px-2 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-0.5" role="tabpanel" aria-label={`${activeCategory.name} emojis`}>
              {activeCategory.emojis.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  type="button"
                  onClick={() => onEmojiSelect(emoji)}
                  className="flex size-10 items-center justify-center rounded-xl text-2xl transition hover:scale-110 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
                  aria-label={`Insert ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type MessageComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  error: string;
};

export function MessageComposer({
  value,
  onChange,
  onSend,
  isSending,
  error,
}: MessageComposerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [category, setCategory] = useState("smileys");
  const containerRef = useRef<HTMLDivElement>(null);
  const canSend = value.trim().length > 0 && !isSending;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <footer className="sticky bottom-0 z-20 shrink-0 border-t border-white/10 bg-slate-950/90 px-3 py-3 backdrop-blur-xl sm:px-5">
      {error && (
        <p className="mb-2 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}
      <div ref={containerRef} className="relative flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          onClick={() => setIsPickerOpen((current) => !current)}
          className="rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-lime-400"
          aria-label={isPickerOpen ? "Close emoji picker" : "Open emoji picker"}
          aria-expanded={isPickerOpen}
        >
          <Smile />
        </Button>

        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          rows={1}
          disabled={isSending}
          className="max-h-28 min-h-10 flex-1 rounded-2xl border-white/10 bg-slate-900/90 px-4 py-2.5 text-[15px] text-white placeholder:text-slate-500 focus-visible:border-lime-400/70 focus-visible:ring-lime-400/20"
          aria-label="Message"
        />

        <Button
          type="button"
          size="icon-lg"
          onClick={onSend}
          disabled={!canSend}
          className="rounded-xl bg-lime-400 text-slate-950 hover:bg-lime-300"
          aria-label={isSending ? "Sending message" : "Send message"}
        >
          {isSending ? <LoaderCircle className="animate-spin" /> : <Send />}
        </Button>

        <EmojiPickerPopover
          isOpen={isPickerOpen}
          selectedCategory={category}
          onCategoryChange={setCategory}
          onEmojiSelect={(emoji) => onChange(value + emoji)}
          onClose={() => setIsPickerOpen(false)}
          containerRef={containerRef}
        />
      </div>
      <p className="mt-1.5 hidden text-right text-[10px] text-slate-600 sm:block">
        Enter to send · Shift+Enter for a new line
      </p>
    </footer>
  );
}
