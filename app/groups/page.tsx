import { GroupsDiscovery } from "@/components/groups/groups-discovery";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ cleanupWarning?: string }>;
}) {
  const { cleanupWarning } = await searchParams;
  return <GroupsDiscovery cleanupWarning={cleanupWarning ?? ""} />;
}
