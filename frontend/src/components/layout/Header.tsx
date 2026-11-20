"use client";

// 상단 메뉴(GNB). Figma S01 프레임 18:45.
// 현재 주소와 맞는 메뉴에 굵은 글씨와 초록 밑줄을 준다. 주소를 읽어야 해서 클라이언트 컴포넌트다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/lib/session";
import styles from "./Header.module.css";

const MENUS = [
  { label: "지도 매물", href: "/map" },
  { label: "내 공간", href: "/space/new" },
  { label: "업종별 견적", href: "/quote" },
  { label: "집기 마켓", href: "/market" },
  { label: "창업 가이드", href: "/guide" },
];

export default function Header() {
  const pathname = usePathname();
  const { session, ready } = useSession();
  const isLoggedIn = ready && session !== null;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/map" className={styles.logo}>
          shopportunity
        </Link>

        <nav className={styles.menus}>
          {MENUS.map((menu) => {
            const isActive = pathname.startsWith(menu.href);
            return (
              <Link
                key={menu.href}
                href={menu.href}
                className={isActive ? `${styles.menu} ${styles.menuActive}` : styles.menu}
              >
                {menu.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.account}>
          <Link href="/partner/apply" className={styles.partner}>
            파트너 입점
          </Link>
          {isLoggedIn ? (
            // 로그인한 상태에서는 이메일과 로그아웃 버튼을 보여 준다.
            <>
              <span className={styles.email}>{session?.email}</span>
              <button type="button" className={styles.logout} onClick={() => signOut()}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.login}>
                로그인
              </Link>
              <Link href="/signup" className={styles.signup}>
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
