import type { SupabaseClient } from "@supabase/supabase-js";

export async function getUnreadMessageCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  if (!userId) return 0;

  const { data, error } = await supabase.rpc("get_unread_message_count");

  if (error) throw error;

  return Number(data ?? 0);
}
