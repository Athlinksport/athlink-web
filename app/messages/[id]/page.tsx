"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import AppNavbar from "@/components/AppNavbar";
import {
  type ChatMessage,
  type ConversationUser,
  ConversationHeader,
  MessageComposer,
  MessageList,
} from "@/components/chat/DirectChat";
import { createClient } from "@/lib/supabase/client";

type ConversationMember = {
  user_id: string;
  profiles: ConversationUser | null;
};

export default function MessagePage() {
  const params = useParams<{ id: string }>();
  const [supabase] = useState(() => createClient());
  const conversationId = params.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [otherUser, setOtherUser] = useState<ConversationUser | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const sendingRef = useRef(false);

  useEffect(() => {
    async function loadMessages() {
      setIsLoading(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data: members, error: membersError } = await supabase
        .from("conversation_members")
        .select(`
          user_id,
          profiles!conversation_members_user_profile_fkey (
            id,
            display_name,
            avatar_url,
            city_name
          )
        `)
        .eq("conversation_id", conversationId);

      if (membersError) {
        setErrorMessage(membersError.message);
      }

      const typedMembers = (members ?? []) as unknown as ConversationMember[];
      const other = typedMembers.find((member) => member.user_id !== user.id);
      setOtherUser(other?.profiles ?? null);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setMessages((data ?? []) as ChatMessage[]);
      setIsLoading(false);
    }

    loadMessages();
  }, [conversationId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incomingMessage = payload.new as ChatMessage;

          setMessages((current) => {
            const exists = current.some(
              (message) => message.id === incomingMessage.id,
            );

            if (exists) {
              return current;
            }

            return [...current, incomingMessage];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  async function handleSendMessage() {
    const content = newMessage.trim();

    if (!content || sendingRef.current) return;

    sendingRef.current = true;
    setIsSending(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("You must be signed in to send a message.");
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content,
        })
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const sentMessage = data as ChatMessage;
      setMessages((current) => {
        const exists = current.some((message) => message.id === sentMessage.id);
        return exists ? current : [...current, sentMessage];
      });
      setNewMessage("");
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-slate-950 text-white">
      <AppNavbar />

      <section className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 px-0 py-0 sm:px-4 sm:py-4 lg:px-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden border-white/10 bg-slate-950 sm:rounded-3xl sm:border sm:bg-slate-900/40 sm:shadow-2xl sm:shadow-black/20">
          <ConversationHeader otherUser={otherUser} />
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            isLoading={isLoading}
          />
          <MessageComposer
            value={newMessage}
            onChange={setNewMessage}
            onSend={handleSendMessage}
            isSending={isSending}
            error={errorMessage}
          />
        </div>
      </section>
    </main>
  );
}
