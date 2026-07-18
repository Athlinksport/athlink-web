"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppNavbar from "@/components/AppNavbar";
import { createClient } from "@/lib/supabase/client";

type ConnectionProfile = {
    display_name: string | null;
    avatar_url: string | null;
    city_name: string | null;
};

type ConnectionRequest = {
    id: string;
    sender_id: string;
    receiver_id?: string;
    status: "pending" | "accepted" | "declined";
    created_at: string;
    sender?: ConnectionProfile | null;
    receiver?: ConnectionProfile | null;
};

export default function ConnectionsPage() {
    const router = useRouter();
    const supabase = createClient();
    const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);

    const [currentUserId, setCurrentUserId] = useState("");
    const [connections, setConnections] = useState<ConnectionRequest[]>([]);
    const [requests, setRequests] = useState<ConnectionRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function loadRequests() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/login");
                return;
            }

            setCurrentUserId(user.id);

            const { data, error } = await supabase
                .from("connections")
                .select(`
          id,
          sender_id,
          receiver_id,
          status,
          created_at,
          sender:profiles!connections_sender_profile_fkey (
            display_name,
            avatar_url,
            city_name
          )
        `)
                .eq("receiver_id", user.id)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (error) {
                console.log("ERROR:", error);
                alert(JSON.stringify(error, null, 2));

                setMessage(error.message);
                setIsLoading(false);
                return;
            }

            setRequests((data || []) as unknown as ConnectionRequest[]);
            const { data: sentData, error: sentError } = await supabase
                .from("connections")
                .select(`
    id,
    sender_id,
    status,
    created_at,
    receiver:profiles!connections_receiver_profile_fkey (
      display_name,
      avatar_url,
      city_name
    )
  `)
                .eq("sender_id", user.id)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (sentError) {
                console.error(sentError);
                setMessage(sentError.message);
                setIsLoading(false);
                return;
            }

            setSentRequests((sentData || []) as unknown as ConnectionRequest[]);
            const { data: connectionsData, error: connectionsError } = await supabase
                .from("connections")
                .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        sender:profiles!connections_sender_profile_fkey (
            display_name,
            avatar_url,
            city_name
        ),
        receiver:profiles!connections_receiver_profile_fkey (
            display_name,
            avatar_url,
            city_name
        )
    `)
                .eq("status", "accepted")
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order("created_at", { ascending: false });

            if (connectionsError) {
                console.error(connectionsError);
                setMessage(connectionsError.message);
                setIsLoading(false);
                return;
            }

            setConnections(
                (connectionsData || []) as unknown as ConnectionRequest[]
            );
            setIsLoading(false);
        }

        loadRequests();
    }, [router, supabase]);

    async function updateRequest(
        requestId: string,
        newStatus: "accepted" | "declined"
    ) {
        setMessage("");

        const { error } = await supabase
            .from("connections")
            .update({
                status: newStatus,
            })
            .eq("id", requestId);

        if (error) {
            setMessage(error.message);
            return;
        }

        setRequests((current) =>
            current.filter((request) => request.id !== requestId)
        );
    }

    async function cancelSentRequest(requestId: string) {
        setMessage("");

        const { error } = await supabase
            .from("connections")
            .delete()
            .eq("id", requestId);

        if (error) {
            setMessage(error.message);
            return;
        }

        setSentRequests((current) =>
            current.filter((request) => request.id !== requestId)
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <AppNavbar />

            <section className="mx-auto max-w-4xl px-6 py-14">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-lime-400">
                        Connections
                    </p>

                    <h1 className="mt-4 text-4xl font-bold">
                        Connection requests
                    </h1>

                    <p className="mt-3 text-slate-400">
                        Review people who want to connect with you.
                    </p>
                </div>

                {message && (
                    <p className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {message}
                    </p>
                )}

                {isLoading ? (
                    <p className="mt-10 text-slate-400">
                        Loading requests...
                    </p>
                ) : requests.length === 0 ? (
                    <div className="mt-10 rounded-3xl border border-dashed border-white/10 p-10 text-center">
                        <h2 className="text-xl font-semibold">
                            No pending requests
                        </h2>

                        <p className="mt-3 text-slate-500">
                            New connection requests will appear here.
                        </p>

                        <Link
                            href="/discover"
                            className="mt-6 inline-flex rounded-xl bg-lime-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-lime-300"
                        >
                            Discover athletes
                        </Link>
                    </div>
                ) : (
                    <div className="mt-10 space-y-4">
                        {requests.map((request) => {
                            const name =
                                request.sender?.display_name || "Athlink member";

                            return (
                                <article
                                    key={request.id}
                                    className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800">
                                            {request.sender?.avatar_url ? (
                                                <img
                                                    src={request.sender.avatar_url}
                                                    alt={name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xl font-bold text-lime-400">
                                                    {name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h2 className="text-lg font-semibold">
                                                {name}
                                            </h2>

                                            {request.sender?.city_name && (
                                                <p className="mt-1 text-sm text-slate-400">
                                                    📍 {request.sender.city_name}
                                                </p>
                                            )}

                                            <Link
                                                href={`/players/${request.sender_id}`}
                                                className="mt-2 inline-block text-sm font-medium text-lime-400 hover:text-lime-300"
                                            >
                                                View profile
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:flex">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateRequest(request.id, "declined")
                                            }
                                            className="rounded-xl border border-white/10 px-5 py-3 font-medium text-slate-300 transition hover:bg-white/5"
                                        >
                                            Decline
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateRequest(request.id, "accepted")
                                            }
                                            className="rounded-xl bg-lime-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-lime-300"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
                <div className="mt-14">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Sent
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold">
                        Sent requests
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                        Requests waiting for a response.
                    </p>

                    {sentRequests.length === 0 ? (
                        <div className="mt-6 rounded-3xl border border-dashed border-white/10 p-8 text-center">
                            <h3 className="text-lg font-semibold">
                                No sent requests
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                                Requests you send will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-4">
                            {sentRequests.map((request) => {
                                const name =
                                    request.receiver?.display_name ||
                                    "Athlink member";

                                return (
                                    <article
                                        key={request.id}
                                        className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800">
                                                {request.receiver?.avatar_url ? (
                                                    <img
                                                        src={request.receiver.avatar_url}
                                                        alt={name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-xl font-bold text-lime-400">
                                                        {name.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-semibold">
                                                    {name}
                                                </h3>

                                                {request.receiver?.city_name && (
                                                    <p className="mt-1 text-sm text-slate-400">
                                                        📍 {request.receiver.city_name}
                                                    </p>
                                                )}

                                                {request.receiver_id && (
                                                    <Link
                                                        href={`/players/${request.receiver_id}`}
                                                        className="mt-2 inline-block text-sm font-medium text-lime-400 hover:text-lime-300"
                                                    >
                                                        View profile
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-300">
                                                Pending
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => cancelSentRequest(request.id)}
                                                className="rounded-xl border border-red-400/20 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-400/10"
                                            >
                                                Cancel request
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                    <div className="mt-14">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Network
                        </p>

                        <h2 className="mt-2 text-2xl font-semibold">
                            My connections
                        </h2>

                        <p className="mt-2 text-sm text-slate-400">
                            Athletes you are connected with.
                        </p>

                        {connections.length === 0 ? (
                            <div className="mt-6 rounded-3xl border border-dashed border-white/10 p-8 text-center">
                                <h3 className="text-lg font-semibold">
                                    No connections yet
                                </h3>

                                <p className="mt-2 text-sm text-slate-500">
                                    Accepted connections will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-6 space-y-4">
                                {connections.map((connection) => {
                                    const isSender =
                                        connection.sender_id === currentUserId;

                                    const profile = isSender
                                        ? connection.receiver
                                        : connection.sender;

                                    const profileId = isSender
                                        ? connection.receiver_id
                                        : connection.sender_id;

                                    const name =
                                        profile?.display_name || "Athlink member";

                                    return (
                                        <article
                                            key={connection.id}
                                            className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800">
                                                    {profile?.avatar_url ? (
                                                        <img
                                                            src={profile.avatar_url}
                                                            alt={name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-xl font-bold text-lime-400">
                                                            {name.charAt(0).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>

                                                <div>
                                                    <h3 className="text-lg font-semibold">
                                                        {name}
                                                    </h3>

                                                    {profile?.city_name && (
                                                        <p className="mt-1 text-sm text-slate-400">
                                                            📍 {profile.city_name}
                                                        </p>
                                                    )}

                                                    {profileId && (
                                                        <Link
                                                            href={`/players/${profileId}`}
                                                            className="mt-2 inline-block text-sm font-medium text-lime-400 hover:text-lime-300"
                                                        >
                                                            View profile
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>

                                            <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-4 py-2 text-sm font-medium text-lime-300">
                                                Connected
                                            </span>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}