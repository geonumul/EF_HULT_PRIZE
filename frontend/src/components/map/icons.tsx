// 지도 화면에서 쓰는 작은 아이콘. 시안(S01)의 SVG를 옮겼다.
type IconProps = { size?: number; color?: string };

export function SearchIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M15 9.16667C15 12.3883 12.3883 15 9.16667 15C5.94501 15 3.33333 12.3883 3.33333 9.16667C3.33333 5.94501 5.94501 3.33333 9.16667 3.33333C12.3883 3.33333 15 5.94501 15 9.16667Z" stroke="#191F28" strokeWidth="1.66667" />
      <path d="M16.6667 16.6667L13.3333 13.3333" stroke="#191F28" strokeWidth="1.66667" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 3.75V14.25M3.75 9H14.25" stroke="#191F28" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MinusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3.75 9H14.25" stroke="#191F28" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function LocateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 12C10.6569 12 12 10.6569 12 9C12 7.34315 10.6569 6 9 6C7.34315 6 6 7.34315 6 9C6 10.6569 7.34315 12 9 12Z" fill="#00A862" />
      <path d="M15 9C15 12.3137 12.3137 15 9 15C5.68629 15 3 12.3137 3 9C3 5.68629 5.68629 3 9 3C12.3137 3 15 5.68629 15 9Z" stroke="#191F28" strokeWidth="1.5" />
      <path d="M9 0.75V3M9 15V17.25M0.75 9H3M15 9H17.25" stroke="#191F28" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SparkIcon({ color = "#00A862" }: IconProps) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 1L7.2 4.3L10.5 5.5L7.2 6.7L6 10L4.8 6.7L1.5 5.5L4.8 4.3L6 1Z" fill={color} />
    </svg>
  );
}

type BookmarkProps = { size?: number; active?: boolean; color?: string };

export function BookmarkIcon({ size = 20, active = false, color = "#B0B8C1" }: BookmarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={active ? "#00A862" : "none"} aria-hidden>
      <path
        d="M5 3.33333H15V16.6667L10 13.3333L5 16.6667V3.33333Z"
        stroke={active ? "#00A862" : color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.66667 3.33333H13.3333V10.6667H6L2.66667 13.3333V3.33333Z" stroke="white" strokeWidth="1.33333" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 4.5L6 7.5L9 4.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
