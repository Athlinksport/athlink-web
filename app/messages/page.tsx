"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  MessageInbox,
  MessageInboxLoading,
} from "@/components/messages/message-inbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Surface } from "@/components/ui/surface";
import {
  getMessageInbox,
  type InboxConversation,
} from "@/lib/messages/get-message-inbox";
import { useAuth } from "@/hooks/use-auth";

export default function MessagesPage() {
  const router = useRouter();
  const { supabase, user, isAuthLoading } = useAuth();
  const [currentUserId, setCurrentUserId] = useState("");
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadInbox() {
      if (isAuthLoading) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const inbox = await getMessageInbox(supabase, user.id);

        if (!ignore) {
          setCurrentUserId(user.id);
          setConversations(inbox);
        }
      } catch {
        if (!ignore) {
          setErrorMessage("Please try again in a moment.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadInbox();

    return () => {
      ignore = true;
    };
  }, [isAuthLoading, router, supabase, user]);

  return (
    <main className="min-h-screen bg-transparent text-foreground">
      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6 sm:mb-8">
          <p className="text-sm font-semibold tracking-wide text-primary">
            Conversations
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Messages
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Keep in touch with your Athlink connections.
          </p>
        </header>

        {isLoading ? (
          <MessageInboxLoading />
        ) : errorMessage ? (
          <Surface variant="glass">
            <EmptyState
              icon={AlertCircle}
              title="Messages could not be loaded"
              description={errorMessage}
            />
          </Surface>
        ) : (
          <MessageInbox
            conversations={conversations}
            currentUserId={currentUserId}
          />
        )}
      </section>
    </main>
  );
}
