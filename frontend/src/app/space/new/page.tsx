// 내 공간. 공실이 아니어도 가로, 깊이, 천장 높이를 입력하면 그 공간의 배치와 견적을 볼 수 있다.
import MySpaceForm from "@/components/space/MySpaceForm";
import Footer from "@/components/layout/Footer";

export default function NewSpacePage() {
  return (
    <>
      <MySpaceForm />
      <Footer />
    </>
  );
}
