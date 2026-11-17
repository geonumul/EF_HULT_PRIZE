// 첫 화면은 공실 지도다. 주소창에 / 만 입력해도 /map으로 보낸다.
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/map");
}
