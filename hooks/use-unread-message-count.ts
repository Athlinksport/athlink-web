"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getUnreadMessageCount } from "@/lib/messages/get-unread-message-count";
import {
  MESSAGES_READ_EVENT,
  type MessagesReadEventDetail,
} from "@/lib/messages/constants";
import { applyConfirmedUnreadCount } from "@/lib/messages/validation";

export function useUnreadMessageCount(
  supabase: SupabaseClient,
  userId: string | null,
  refreshKey?: string,
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const userIdRef = useRef(userId);
  const requestGenerationRef = useRef(0);
  const readResultGenerationRef = useRef(0);

  const refreshUnreadCount = useCallback(async () => {
    const requestedUserId = userIdRef.current;
    if (!requestedUserId) return;
    const generation = ++requestGenerationRef.current;
    const readResultGeneration = readResultGenerationRef.current;
    try {
      const count = await getUnreadMessageCount(supabase, requestedUserId);
      if (
        generation === requestGenerationRef.current
        && readResultGeneration === readResultGenerationRef.current
        && userIdRef.current === requestedUserId
      ) {
        setUnreadCount(count);
      }
    } catch (error) {
      console.error(
        "Unable to load unread messages count:",
        error instanceof Error ? error.message : error,
      );
    }
  }, [supabase]);

  useEffect(() => {
    userIdRef.current = userId;
    if (!userId) {
      requestGenerationRef.current += 1;
      return;
    }
    void refreshUnreadCount();
  }, [refreshKey, refreshUnreadCount, userId]);

  useEffect(() => {
    if (!userId) return;

    let subscribed = false;
    const refresh = () => void refreshUnreadCount();
    const refreshFromRealtime = () => {
      if (subscribed) refresh();
    };
    const channel = supabase
      .channel(`unread-message-count-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        refreshFromRealtime,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reads",
          filter: `user_id=eq.${userId}`,
        },
        refreshFromRealtime,
      )
      .subscribe((status) => {
        const wasSubscribed = subscribed;
        subscribed = status === "SUBSCRIBED";
        if (subscribed && !wasSubscribed) refresh();
      });

    function onVisibilityChange() {
      if (document.visibilityState === "visible") refresh();
    }

    function onMessagesRead(event: Event) {
      const confirmedUnreadCount = (
        event as CustomEvent<Partial<MessagesReadEventDetail>>
      ).detail?.unreadCount;
      if (typeof confirmedUnreadCount === "number") {
        readResultGenerationRef.current += 1;
        requestGenerationRef.current += 1;
        setUnreadCount((current) => applyConfirmedUnreadCount(current, confirmedUnreadCount));
      }
      refresh();
    }

    window.addEventListener("focus", refresh);
    window.addEventListener(MESSAGES_READ_EVENT, onMessagesRead);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      subscribed = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener(MESSAGES_READ_EVENT, onMessagesRead);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [refreshUnreadCount, supabase, userId]);

  return {
    unreadCount: userId ? unreadCount : 0,
    refreshUnreadCount,
  };
}
