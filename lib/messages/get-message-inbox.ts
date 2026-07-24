import type { SupabaseClient } from "@supabase/supabase-js";

export type InboxParticipant = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type InboxMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};

export type InboxConversation = {
  id: string;
  participant: InboxParticipant | null;
  lastMessage: InboxMessage | null;
  unreadCount: number;
};

type ConversationMemberRow = {
  conversation_id: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type MessageReadRow = {
  message_id: string;
};

export async function getMessageInbox(
  supabase: SupabaseClient,
  userId: string,
): Promise<InboxConversation[]> {
  const membershipsResult = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  if (membershipsResult.error) throw membershipsResult.error;

  const conversationIds = (membershipsResult.data ?? []).map(
    (membership) => membership.conversation_id as string,
  );

  if (conversationIds.length === 0) return [];

  const [membersResult, messagesResult] = await Promise.all([
    supabase
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds)
      .neq("user_id", userId),
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (messagesResult.error) throw messagesResult.error;

  const members = (membersResult.data ?? []) as ConversationMemberRow[];
  const messages = (messagesResult.data ?? []) as MessageRow[];
  const participantIds = [...new Set(members.map((member) => member.user_id))];
  const unreadMessages = messages.filter(
    (message) => message.sender_id !== userId,
  );

  const [profilesResult, readsResult] = await Promise.all([
    participantIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", participantIds)
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    unreadMessages.length > 0
      ? supabase
          .from("message_reads")
          .select("message_id")
          .eq("user_id", userId)
          .in(
            "message_id",
            unreadMessages.map((message) => message.id),
          )
      : Promise.resolve({ data: [] as MessageReadRow[], error: null }),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (readsResult.error) throw readsResult.error;

  const profilesById = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );
  const participantByConversationId = new Map(
    members.map((member) => [
      member.conversation_id,
      profilesById.get(member.user_id),
    ]),
  );
  const lastMessageByConversationId = new Map<string, MessageRow>();

  for (const message of messages) {
    if (!lastMessageByConversationId.has(message.conversation_id)) {
      lastMessageByConversationId.set(message.conversation_id, message);
    }
  }

  const readMessageIds = new Set(
    ((readsResult.data ?? []) as MessageReadRow[]).map(
      (read) => read.message_id,
    ),
  );
  const unreadCounts = new Map<string, number>();

  for (const message of unreadMessages) {
    if (readMessageIds.has(message.id)) continue;

    unreadCounts.set(
      message.conversation_id,
      (unreadCounts.get(message.conversation_id) ?? 0) + 1,
    );
  }

  return conversationIds
    .map((conversationId) => {
      const profile = participantByConversationId.get(conversationId);
      const message = lastMessageByConversationId.get(conversationId);

      return {
        id: conversationId,
        participant: profile
          ? {
              id: profile.id,
              displayName: profile.display_name,
              avatarUrl: profile.avatar_url,
            }
          : null,
        lastMessage: message
          ? {
              id: message.id,
              senderId: message.sender_id,
              content: message.content,
              createdAt: message.created_at,
            }
          : null,
        unreadCount: unreadCounts.get(conversationId) ?? 0,
      };
    })
    .sort((first, second) => {
      const firstTime = first.lastMessage
        ? Date.parse(first.lastMessage.createdAt)
        : 0;
      const secondTime = second.lastMessage
        ? Date.parse(second.lastMessage.createdAt)
        : 0;

      return secondTime - firstTime || first.id.localeCompare(second.id);
    });
}
