
import { redirect } from "next/navigation";

// Redirect /watch/[id] → /video/[id] (canonical video detail page handles playback)
export default async function WatchRedirect({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  redirect(`/video/${contentId}`);
}
