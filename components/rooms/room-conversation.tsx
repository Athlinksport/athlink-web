"use client";

import { ArrowLeft, Check, CheckCheck, LoaderCircle, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { Textarea } from "@/components/ui/textarea";
import { ReportDialog } from "@/components/safety/report-dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  DIRECT_MESSAGE_MAX_LENGTH,
  MESSAGES_READ_EVENT,
  type MessagesReadEventDetail,
} from "@/lib/messages/constants";
import { cn } from "@/lib/utils";

type Participant = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  city_name: string | null;
  country_name: string | null;
};

type RoomMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  read_at: string | null;
  status?: "sending" | "failed";
  clientContent?: string;
};

function mergeMessages(current: RoomMessage[], incoming: RoomMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message });
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function RoomConversation() {
  const { id: conversationId } = useParams<{ id: string }>();
  const router = useRouter();
  const { supabase, user, isAuthLoading } = useAuth();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [composerError, setComposerError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const initialScrollRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const pendingScrollRef = useRef<ScrollBehavior | null>(null);
  const prependScrollRef = useRef<{ height: number; top: number } | null>(null);
  const markReadInFlightRef = useRef(false);
  const markReadPendingRef = useRef(false);

  const markRead = useCallback(() => {
    if (!user || !conversationId || document.visibilityState !== "visible") return;
    if (markReadInFlightRef.current) {
      markReadPendingRef.current = true;
      return;
    }

    markReadInFlightRef.current = true;
    const run = async () => {
      try {
        do {
          markReadPendingRef.current = false;
          try {
            if (process.env.NODE_ENV === "development") {
              console.info("Marking direct conversation read", {
                conversationId,
                userId: user.id,
              });
            }

            const { data: markedRead, error: markReadError } = await supabase.rpc(
              "mark_direct_conversation_read",
              { target_conversation_id: conversationId },
            );
            if (markReadError) {
              throw new Error(
                markReadError.code === "42501"
                  ? "Conversation access denied."
                  : "Read state could not be updated.",
              );
            }

            const { data: unreadCount, error: unreadCountError } =
              await supabase.rpc("get_unread_message_count");
            if (unreadCountError) {
              throw new Error("Unread count could not be refreshed.");
            }

            const result = {
              markedRead: Number(markedRead ?? 0),
              unreadCount: Number(unreadCount ?? 0),
            };
            if (process.env.NODE_ENV === "development") {
              console.info("Direct conversation read state updated", result);
            }
            setReadError("");
            setMessages((current) => current.map((message) => (
              message.sender_id === user.id ? message : { ...message, read_at: message.read_at ?? new Date().toISOString() }
            )));
            window.dispatchEvent(new CustomEvent<MessagesReadEventDetail>(
              MESSAGES_READ_EVENT,
              { detail: { conversationId, unreadCount: result.unreadCount } },
            ));
          } catch (markReadError) {
            const message = markReadError instanceof Error
              ? markReadError.message
              : "Read state could not be updated.";
            setReadError(message);
            if (process.env.NODE_ENV === "development") {
              console.error("Unable to mark direct conversation read:", message);
            }
          }
        } while (markReadPendingRef.current);
      } finally {
        markReadInFlightRef.current = false;
      }
    };
    void run();
  }, [conversationId, supabase, user]);

  const loadInitial = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const [roomResponse, messagesResponse] = await Promise.all([
        fetch(`/api/rooms/${conversationId}`, { cache: "no-store" }),
        fetch(`/api/rooms/${conversationId}/messages`, { cache: "no-store" }),
      ]);
      const roomResult = await roomResponse.json() as { error?: string; conversation?: { participant: Participant } };
      const messagesResult = await messagesResponse.json() as {
        error?: string;
        messages?: RoomMessage[];
        hasMore?: boolean;
        nextCursor?: string | null;
        markedRead?: number;
        unreadCount?: number;
      };
      if (!roomResponse.ok) throw new Error(roomResult.error ?? "Conversation not found.");
      if (!messagesResponse.ok) throw new Error(messagesResult.error ?? "Messages could not be loaded.");
      if (
        typeof messagesResult.markedRead !== "number"
        || typeof messagesResult.unreadCount !== "number"
      ) {
        throw new Error("The read-state response was invalid.");
      }
      setParticipant(roomResult.conversation?.participant ?? null);
      setMessages(messagesResult.messages ?? []);
      setHasMore(Boolean(messagesResult.hasMore));
      setCursor(messagesResult.nextCursor ?? null);
      initialScrollRef.current = false;
      setReadError("");
      window.dispatchEvent(new CustomEvent<MessagesReadEventDetail>(
        MESSAGES_READ_EVENT,
        {
          detail: {
            conversationId,
            unreadCount: messagesResult.unreadCount,
          },
        },
      ));
      if (process.env.NODE_ENV === "development") {
        console.info("RoomConversation initial message loading completed", {
          conversationId,
          messageCount: messagesResult.messages?.length ?? 0,
          markedRead: messagesResult.markedRead,
          unreadCount: messagesResult.unreadCount,
        });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Conversation could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.info("RoomConversation mounted", { conversationId });
    }
  }, [conversationId]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const timeout = window.setTimeout(() => { void loadInitial(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [isAuthLoading, loadInitial, router, user]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || isLoading) return;

    if (prependScrollRef.current) {
      const { height, top } = prependScrollRef.current;
      viewport.scrollTop = top + viewport.scrollHeight - height;
      prependScrollRef.current = null;
      return;
    }

    if (!initialScrollRef.current) {
      viewport.scrollTop = viewport.scrollHeight;
      initialScrollRef.current = true;
      isNearBottomRef.current = true;
      return;
    }

    if (pendingScrollRef.current) {
      endRef.current?.scrollIntoView({
        behavior: pendingScrollRef.current,
        block: "end",
      });
      pendingScrollRef.current = null;
    }
  }, [isLoading, messages.length]);

  const updateNearBottom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    isNearBottomRef.current =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (!user || isLoading) return;
    let subscribed = false;
    const channel = supabase
      .channel(`room-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (!subscribed) return;
          const incoming = (payload.new ?? payload.old) as RoomMessage;
          if (!incoming?.id) return;
          const shouldFollowIncoming = isNearBottomRef.current;
          setMessages((current) => {
            const pendingIndex = payload.eventType === "INSERT"
              ? current.findIndex((message) => message.status === "sending"
                && message.sender_id === incoming.sender_id
                && message.clientContent === incoming.content)
              : -1;
            const withoutPending = pendingIndex >= 0
              ? current.filter((_, index) => index !== pendingIndex)
              : current;
            return mergeMessages(withoutPending, [{ ...incoming, read_at: null }]);
          });
          if (payload.eventType === "INSERT" && incoming.sender_id !== user.id) {
            if (shouldFollowIncoming) pendingScrollRef.current = "smooth";
            markRead();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reads" },
        (payload) => {
          if (!subscribed) return;
          const receipt = payload.new as { message_id?: string; user_id?: string; read_at?: string };
          if (!receipt.message_id || receipt.user_id === user.id) return;
          setMessages((current) => current.map((message) => message.id === receipt.message_id
            ? { ...message, read_at: receipt.read_at ?? new Date().toISOString() }
            : message));
        },
      )
      .subscribe((status) => { subscribed = status === "SUBSCRIBED"; });
    return () => {
      subscribed = false;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, isLoading, markRead, supabase, user]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") markRead();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [markRead]);

  async function loadOlder() {
    if (!cursor || isLoadingOlder) return;
    const viewport = viewportRef.current;
    const previousHeight = viewport?.scrollHeight ?? 0;
    const previousTop = viewport?.scrollTop ?? 0;
    setIsLoadingOlder(true);
    try {
      const response = await fetch(`/api/rooms/${conversationId}/messages?before=${encodeURIComponent(cursor)}`, { cache: "no-store" });
      const result = await response.json() as { error?: string; messages?: RoomMessage[]; hasMore?: boolean; nextCursor?: string | null };
      if (!response.ok) throw new Error(result.error ?? "Older messages could not be loaded.");
      prependScrollRef.current = { height: previousHeight, top: previousTop };
      setMessages((current) => mergeMessages(result.messages ?? [], current));
      setHasMore(Boolean(result.hasMore));
      setCursor(result.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Older messages could not be loaded.");
    } finally {
      setIsLoadingOlder(false);
    }
  }

  async function sendMessage(rawContent: string, retryId?: string) {
    const trimmed = rawContent.trim();
    if (!user || isSending || !trimmed) return;
    if (trimmed.length > DIRECT_MESSAGE_MAX_LENGTH) {
      setComposerError(`Message must be ${DIRECT_MESSAGE_MAX_LENGTH} characters or fewer.`);
      return;
    }
    const optimisticId = retryId ?? `pending-${crypto.randomUUID()}`;
    const optimistic: RoomMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmed,
      clientContent: trimmed,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      read_at: null,
      status: "sending",
    };
    setMessages((current) => mergeMessages(current.filter((message) => message.id !== retryId), [optimistic]));
    setContent("");
    setComposerError("");
    setIsSending(true);
    pendingScrollRef.current = "smooth";
    try {
      const response = await fetch(`/api/rooms/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const result = await response.json() as { error?: string; message?: RoomMessage };
      if (!response.ok || !result.message) throw new Error(result.error ?? "Message could not be sent.");
      setMessages((current) => {
        const withoutOptimistic = current.filter((message) => message.id !== optimisticId);
        return mergeMessages(withoutOptimistic, [result.message!]);
      });
    } catch (sendError) {
      setMessages((current) => current.map((message) => message.id === optimisticId
        ? { ...message, status: "failed" }
        : message));
      setComposerError(sendError instanceof Error ? sendError.message : "Message could not be sent.");
    } finally {
      setIsSending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(content);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSending) void sendMessage(content);
    }
  }

  const name = participant?.display_name ?? "Athlink member";
  if (isLoading || isAuthLoading) {
    return <main className="grid min-h-[70svh] place-items-center text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Loading conversation…</main>;
  }
  if (error && !participant) {
    return <main className="mx-auto max-w-2xl px-4 py-16"><InlineError>{error}</InlineError><Button onClick={() => { setIsLoading(true); void loadInitial(); }} className="mt-4"><RefreshCw />Try again</Button></main>;
  }

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
      <section className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 sm:px-4 sm:py-4 lg:px-6">
        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden border-white/10 bg-slate-950/90 sm:rounded-3xl sm:border sm:bg-surface/80">
          <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-3 backdrop-blur-xl sm:px-5">
            <Button nativeButton={false} render={<Link href="/rooms" />} variant="ghost" size="icon" aria-label="Back to rooms"><ArrowLeft /></Button>
            <Avatar size="lg" className="size-11 bg-white/8">
              {participant?.avatar_url && <AvatarImage src={participant.avatar_url} alt="" />}
              <AvatarFallback className="font-semibold text-lime-300">{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Link href={participant ? `/players/${participant.id}` : "/rooms"} className="truncate font-semibold hover:text-lime-300">{name}</Link>
              {(participant?.city_name || participant?.country_name) && <p className="truncate text-xs text-muted-foreground">{[participant.city_name, participant.country_name].filter(Boolean).join(", ")}</p>}
            </div>
          </header>

          <div
            ref={viewportRef}
            onScroll={updateNearBottom}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5"
          >
            {hasMore && <div className="mb-4 text-center"><Button variant="ghost" size="sm" disabled={isLoadingOlder} onClick={() => void loadOlder()}>{isLoadingOlder ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}Load older messages</Button></div>}
            {error && <InlineError className="mb-4">{error}</InlineError>}
            {readError && <InlineError className="mb-4">{readError}</InlineError>}
            {messages.length === 0 ? (
              <div className="grid min-h-full place-items-center text-center text-muted-foreground"><div><Send className="mx-auto size-7 text-lime-300" /><p className="mt-3 font-medium text-white">Start the conversation</p><p className="mt-1 text-sm">Send a message to {name}.</p></div></div>
            ) : (
              <div className="space-y-2.5">
                {messages.map((message) => {
                  const mine = message.sender_id === user?.id;
                  return (
                    <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[86%] rounded-2xl px-3.5 py-2.5 sm:max-w-[72%]", mine ? "rounded-br-md bg-lime-300 text-slate-950" : "rounded-bl-md border border-white/8 bg-white/8")}>
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[15px] leading-5">{message.deleted_at ? "Message deleted" : message.content}</p>
                        <div className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", mine ? "text-slate-700" : "text-muted-foreground")}>
                          <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                          {message.edited_at && <span>edited</span>}
                          {mine && message.status === "sending" && <LoaderCircle className="size-3 animate-spin" aria-label="Sending" />}
                          {mine && message.status === "failed" && <button type="button" className="inline-flex items-center gap-1 font-semibold text-red-700" onClick={() => void sendMessage(message.clientContent ?? message.content, message.id)}><RefreshCw className="size-3" />Retry</button>}
                          {mine && !message.status && (message.read_at ? <CheckCheck className="size-3.5" aria-label="Read" /> : <Check className="size-3.5" aria-label="Sent" />)}
                          {!mine && !message.status && <ReportDialog targetType="message" targetId={message.id} label="Report message" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="shrink-0 border-t border-white/10 bg-slate-950/90 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-5">
            {composerError && <p role="alert" className="mb-2 text-xs text-red-300">{composerError}</p>}
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Textarea value={content} maxLength={DIRECT_MESSAGE_MAX_LENGTH} rows={2} onChange={(event) => { setContent(event.target.value); setComposerError(""); }} onKeyDown={onKeyDown} placeholder={`Message ${name}`} aria-label={`Message ${name}`} className="max-h-36 min-h-11 resize-none [field-sizing:content]" />
                <p className={cn("mt-1 text-right text-[10px] text-muted-foreground", content.length > DIRECT_MESSAGE_MAX_LENGTH - 200 && "text-amber-300")}>{content.length}/{DIRECT_MESSAGE_MAX_LENGTH}</p>
              </div>
              <Button type="submit" size="icon-lg" disabled={isSending || !content.trim()} aria-label="Send message"><Send /></Button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
