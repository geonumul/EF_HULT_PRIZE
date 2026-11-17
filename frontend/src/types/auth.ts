// 로그인과 회원가입에서 쓰는 타입.

export type MemberType = "founder" | "broker" | "supplier" | "builder";

export type Session = {
  email: string;
  memberType: MemberType;
  demo: boolean; // 데모 모드에서 만든 가짜 세션이면 true
};

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  founder: "예비 창업자",
  broker: "중개사·임대인",
  supplier: "공급사",
  builder: "시공사",
};
