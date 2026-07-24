"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getUnreadMessageCount } from "@/lib/messages/get-unread-message-count";

export function useUnreadMessageCount(
  supabase: SupabaseClient,
  userId: string | null,
  refreshKey?: string,
) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      setUnreadCount(await getUnreadMessageCount(supabase, userId));
    } catch (error) {
      console.error(
        "Unable to load unread messages count:",
        error instanceof Error ? error.message : error,
      );
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (!userId) return;

    let ignore = false;

    void getUnreadMessageCount(supabase, userId)
      .then((count) => {
        if (!ignore) setUnreadCount(count);
      })
      .catch((error: unknown) => {
        console.error(
          "Unable to load unread messages count:",
          error instanceof Error ? error.message : error,
        );
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey, supabase, userId]);

  return {
    unreadCount: userId ? unreadCount : 0,
    refreshUnreadCount,
  };
}
