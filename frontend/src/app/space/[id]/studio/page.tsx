// S03 공간 스튜디오. Figma 24:242.
// 공간 id는 주소, 업종은 ?use= 쿼리로 받는다. 공간은 화면에서 불러온다(샘플 공실, 서버 공실, 공실 후보).
import StudioLoader from "@/components/studio/StudioLoader";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ use?: string; style?: string }>;
};

export default async function StudioPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { use, style } = await searchParams;
  return <StudioLoader id={id} use={use} style={style} />;
}
