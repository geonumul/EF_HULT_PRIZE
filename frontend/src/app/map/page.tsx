// S01·S02 공실 지도. /map 은 업종 선택 전(S01), /map?use=<업종id> 는 업종 선택 후(S02)다.
import { Suspense } from "react";
import MapScreen from "@/components/map/MapScreen";

export default function MapPage() {
  // useSearchParams를 쓰는 컴포넌트는 Suspense로 감싸야 빌드된다.
  return (
    <Suspense fallback={null}>
      <MapScreen />
    </Suspense>
  );
}
