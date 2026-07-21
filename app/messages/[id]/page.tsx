"use client";

import EmojiPicker from "emoji-picker-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRef } from "react";

import AppNavbar from "@/components/AppNavbar";

const emojiCategories = [
    {
        id: "recent",
        label: "🕘",
        emojis: ["😊", "😂", "❤️", "🔥", "👍", "🥰", "😭", "🎉"],
    },
    {
        id: "smileys",
        label: "😀",
        emojis: [
            "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
            "😊", "😇", "🙂", "🙃", "😉", "😍", "🥰", "😘",
            "😋", "😜", "🤪", "🤗", "🤔", "🫡", "😎", "🥳",
        ],
    },
    {
        id: "animals",
        label: "🐱",
        emojis: [
            "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼",
            "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐧",
        ],
    },
    {
        id: "sports",
        label: "⚽",
        emojis: [
            "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🥏",
            "🎱", "🏓", "🏸", "🥊", "🥋", "⛳", "🏹", "🏋️",
        ],
    },
    {
        id: "hearts",
        label: "❤️",
        emojis: [
            "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
            "🤎", "💔", "💕", "💞", "💓", "💗", "💖", "💘",
        ],
    },
];

export default function MessagePage() {
    const params = useParams();
    const supabase = createClient();

    const conversationId = params.id as string;
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");
    const [otherUser, setOtherUser] = useState<any>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const onEmojiClick = (emojiData: any) => {
        setNewMessage((prev) => prev + emojiData.emoji);
    };
    const pickerRef = useRef<HTMLDivElement>(null);
    const [emojiCategory, setEmojiCategory] = useState("smileys");

    useEffect(() => {
        async function loadMessages() {
            setIsLoading(true);

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

            console.log("members:", members);
            console.log("membersError:", membersError);

            if (membersError) {
                console.log("Load conversation member error:", membersError.message);
            }

            const other = members?.find(
                (member: any) => member.user_id !== user.id
            );

            setOtherUser(other?.profiles ?? null);

            setOtherUser(other?.profiles ?? null);

            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: true });

            if (error) {
                console.log("Load messages error:", error.message);
                setIsLoading(false);
                return;
            }

            setMessages(data ?? []);
            setIsLoading(false);
        }

        loadMessages();
    }, [conversationId]);

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
                    setMessages((current) => {
                        const exists = current.some(
                            (message) => message.id === payload.new.id
                        );

                        if (exists) {
                            return current;
                        }

                        return [...current, payload.new];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node)
            ) {
                setShowEmojiPicker(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () =>
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
    }, []);

    async function handleSendMessage() {
        const content = newMessage.trim();

        if (!content) return;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

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
            alert(error.message);
            return;
        }

        setMessages((current) => [...current, data]);
        setNewMessage("");
    }

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <AppNavbar />

            <section className="mx-auto max-w-5xl px-6 py-10">
                <Link
                    href="/connections"
                    className="text-lime-400 hover:text-lime-300"
                >
                    ← Back
                </Link>

                <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800">
                        {otherUser?.avatar_url ? (
                            <img
                                src={otherUser.avatar_url}
                                alt={otherUser.display_name || "Athlink member"}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-xl font-bold text-lime-400">
                                {(otherUser?.display_name || "A").charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div>
                        <h1 className="text-xl font-semibold">
                            {otherUser?.display_name || "Athlink member"}
                        </h1>

                        {otherUser?.city_name && (
                            <p className="mt-1 text-sm text-slate-400">
                                📍 {otherUser.city_name}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
                    {isLoading ? (
                        <p className="text-center text-slate-500">
                            Loading messages...
                        </p>
                    ) : messages.length === 0 ? (
                        <p className="py-10 text-center text-slate-500">
                            No messages yet.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message) => {
                                const isMine = message.sender_id === currentUserId;

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${isMine ? "justify-end" : "justify-start"
                                            }`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-3 ${isMine
                                                ? "bg-lime-400 text-slate-950"
                                                : "bg-slate-800 text-white"
                                                }`}
                                        >
                                            <p>{message.content}</p>

                                            <p
                                                className={`mt-2 text-xs ${isMine
                                                    ? "text-slate-700"
                                                    : "text-slate-500"
                                                    }`}
                                            >
                                                {new Date(message.created_at).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div ref={pickerRef} className="relative mt-6">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker((current) => !current)}
                            className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-2xl transition hover:bg-white/15"
                            aria-label="Open emoji picker"
                        >
                            <span className="transition group-hover:scale-110">☺</span>
                        </button>

                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Type a message..."
                            className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-lime-400"
                        />

                        <button
                            type="button"
                            onClick={handleSendMessage}
                            className="rounded-xl bg-lime-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-lime-300"
                        >
                            Send
                        </button>
                    </div>

                    {showEmojiPicker && (
                        <div
                            className="
                            absolute
                            bottom-16
                            inset-x-0
                            z-30
                            overflow-hidden

                            rounded-[32px]

                            border border-white/10

                            bg-white/5

                            backdrop-blur-[40px]
                            backdrop-saturate-[180%]

                            shadow-[0_20px_80px_rgba(0,0,0,.45)]

                            before:absolute
                            before:inset-0
                            before:bg-gradient-to-b
                            before:from-white/10
                            before:to-transparent
                            before:pointer-events-none
                        ">
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.10] via-white/[0.03] to-transparent" />

                            <div className="relative">
                                <div
                                    className="
                                    flex
                                    items-center
                                    gap-3

                                    px-5
                                    py-4

                                    border-b
                                    border-white/10

                                    bg-white/[0.02]
                                ">
                                    {emojiCategories.map((category) => (
                                        <button

                                            key={category.id}

                                            type="button"

                                            onClick={() => setEmojiCategory(category.id)}

                                            className={`
                                              flex
                                              h-12
                                              w-12
                                              shrink-0
                                              items-center
                                              justify-center
                                              rounded-2xl
                                              text-xl
                                              transition-all
                                              duration-200
                                              ${emojiCategory === category.id
                                                    ? "scale-105 border border-white/20 bg-white/15"
                                                    : "bg-transparent hover:bg-white/10"
                                                }
                                            `}
                                        >
                                            {category.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                                <div
                                className="
                                overflow-x-auto
                                scroll-smooth
                                
                                [&::-webkit-scrollbar]:hidden
                                [-ms-overflow-style:none]
                                [scrollbar-width:none]
                                "
                                >
                                    <div className="flex min-w-max items-center gap-2">
                                        {emojiCategories
                                            .find((category) => category.id === emojiCategory)
                                            ?.emojis.map((emoji, index) => (
                                                <button
                                                    key={`${emoji}-${index}`}
                                                    type="button"
                                                    onClick={() =>
                                                        setNewMessage((current) => current + emoji)
                                                    }
                                                    className="
                                                      flex
                                                      h-14
                                                      w-14
                                                      shrink-0
                                                      items-center
                                                      justify-center
                                                      rounded-2xl
                                                      text-3xl
                                                      transition-all
                                                      duration-200
                                                      hover:scale-110
                                                      hover:bg-white/10
                                                    "
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main >
    );
}