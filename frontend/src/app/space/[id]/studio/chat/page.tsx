// S04 텍스트 렌더링 요청. Figma 25:242.
import ChatLoader from "@/components/studio/ChatLoader";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ use?: string }>;
};

export default async function StudioChatPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { use } = await searchParams;
  return <ChatLoader id={id} use={use} />;
}
