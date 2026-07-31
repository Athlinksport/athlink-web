import { redirect } from "next/navigation";

type MessagePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MessagePage({
  params,
}: MessagePageProps) {
  const { id } = await params;

  redirect(`/rooms/${id}`);
}