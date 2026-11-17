// 백엔드 호출 공통 함수. 서버 주소는 NEXT_PUBLIC_API_URL에서 읽는다.
// 호출이 실패하면 mocks/의 가짜 데이터로 화면이 동작한다.

// 환경변수가 없으면 배포된 백엔드 주소를 쓴다. 공개 주소라서 코드에 둬도 된다. 환경변수를 넣으면 그 값이 우선한다.
const DEFAULT_API_URL = "https://backend-beta-peach-91.vercel.app";
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");

/** 백엔드 주소가 설정되어 있는가 */
export const apiEnabled = Boolean(API_URL);

/**
 * GET 요청을 보내 JSON을 돌려준다.
 * 주소가 없거나 요청이 실패하면 null을 돌려준다. 호출한 쪽은 가짜 데이터로 대신한다.
 */
export async function apiGet<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const response = await fetch(`${API_URL}${path}`);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
