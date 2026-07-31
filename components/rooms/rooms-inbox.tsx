"use client";

import { AlertCircle, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { MessageInbox, MessageInboxLoading } from "@/components/messages/message-inbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Surface } from "@/components/ui/surface";
import { useAuth } from "@/hooks/use-auth";
import type { InboxConversation } from "@/lib/messages/get-message-inbox";
import {
  MESSAGES_READ_EVENT,
  type MessagesReadEventDetail,
} from "@/lib/messages/constants";

type ConversationRow = {
  id: string;
  participant_id: string;
  participant_name: string | null;
  participant_avatar_url: string | null;
  last_message_id: string | null;
  last_message_sender_id: string | null;
  last_message_content: string | null;
  last_message_created_at: string | null;
  unread_count: number | string;
};

export function RoomsInbox() {
  const router = useRouter();
  const { supabase, user, isAuthLoading } = useAuth();
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const requestGenerationRef = useRef(0);
  const readResultGenerationRef = useRef(0);

  const load = useCallback(async () => {
    if (!user) return;
    const generation = ++requestGenerationRef.current;
    const readResultGeneration = readResultGenerationRef.current;
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const result = await response.json() as { error?: string; conversations?: ConversationRow[] };
      if (!response.ok) throw new Error(result.error ?? "Conversations could not be loaded.");
      if (
        !mountedRef.current
        || generation !== requestGenerationRef.current
        || readResultGeneration !== readResultGenerationRef.current
      ) return;
      setConversations((result.conversations ?? []).map((row) => ({
        id: row.id,
        participant: {
          id: row.participant_id,
          displayName: row.participant_name,
          avatarUrl: row.participant_avatar_url,
        },
        lastMessage: row.last_message_id && row.last_message_sender_id && row.last_message_created_at
          ? {
              id: row.last_message_id,
              senderId: row.last_message_sender_id,
              content: row.last_message_content ?? "",
              createdAt: row.last_message_created_at,
            }
          : null,
        unreadCount: Number(row.unread_count) || 0,
      })));
      setError("");
    } catch (loadError) {
      if (
        mountedRef.current
        && generation === requestGenerationRef.current
        && readResultGeneration === readResultGenerationRef.current
      ) {
        setError(loadError instanceof Error ? loadError.message : "Conversations could not be loaded.");
      }
    } finally {
      if (
        mountedRef.current
        && generation === requestGenerationRef.current
        && readResultGeneration === readResultGenerationRef.current
      ) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    if (isAuthLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => {
      window.clearTimeout(timeout);
      mountedRef.current = false;
      requestGenerationRef.current += 1;
    };
  }, [isAuthLoading, load, router, user]);

  useEffect(() => {
    if (!user || isLoading) return;
    let subscribed = false;
    const channel = supabase
      .channel(`rooms-inbox-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        if (!subscribed) return;
        void load();
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reads",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (!subscribed) return;
          void load();
        },
      )
      .subscribe((status) => {
        const wasSubscribed = subscribed;
        subscribed = status === "SUBSCRIBED";
        if (subscribed && !wasSubscribed) void load();
      });

    function onMessagesRead(event: Event) {
      const detail = (
        event as CustomEvent<Partial<MessagesReadEventDetail>>
      ).detail;
      if (
        detail?.conversationId
        && typeof detail.unreadCount === "number"
      ) {
        readResultGenerationRef.current += 1;
        requestGenerationRef.current += 1;
        setConversations((current) => current.map((conversation) => (
          conversation.id === detail.conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )));
      }
      void load();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") void load();
    }

    window.addEventListener("focus", load);
    window.addEventListener(MESSAGES_READ_EVENT, onMessagesRead);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      subscribed = false;
      window.removeEventListener("focus", load);
      window.removeEventListener(MESSAGES_READ_EVENT, onMessagesRead);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [isLoading, load, supabase, user]);

  return (
    <main className="min-h-screen bg-transparent text-foreground">
      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6 sm:mb-8">
          <p className="text-sm font-semibold tracking-wide text-primary">Direct conversations</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Rooms</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">Keep in touch with your Athlink connections.</p>
        </header>
        {isLoading ? <MessageInboxLoading /> : error ? (
          <Surface variant="glass">
            <EmptyState icon={AlertCircle} title="Rooms could not be loaded" description={error} />
          </Surface>
        ) : conversations.length === 0 ? (
          <Surface variant="glass">
            <EmptyState icon={MessageCircle} title="No conversations yet" description="Open a connected athlete’s profile to start a conversation." />
          </Surface>
        ) : (
          <MessageInbox
            conversations={conversations}
            currentUserId={user?.id ?? ""}
            conversationBasePath="/rooms"
          />
        )}
      </section>
    </main>
  );
}
