"use client";

// S09 로그인·회원가입 카드. Figma 39:637. 로그인과 회원가입이 같은 카드를 쓰고 mode로 구분한다.
// 시안의 이용 유형은 3개(공급사·시공사 묶음)지만 회원 유형을 4개로 나눠 받는다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getSupabase, isDemoMode } from "@/lib/supabase";
import { saveSession } from "@/lib/session";
import { MEMBER_TYPE_LABELS, type MemberType } from "@/types/auth";
import styles from "./AuthForm.module.css";

type Props = { mode: "login" | "signup" };

type Errors = { email?: string; password?: string; passwordCheck?: string; agree?: string; form?: string };

const MEMBER_TYPES = Object.keys(MEMBER_TYPE_LABELS) as MemberType[];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(mode: Props["mode"], email: string, password: string, passwordCheck: string, agree: boolean): Errors {
  const errors: Errors = {};
  if (!email.trim()) errors.email = "이메일을 입력해 주세요.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "이메일 형식이 올바르지 않습니다.";

  if (!password) errors.password = "비밀번호를 입력해 주세요.";
  else if (password.length < 8) errors.password = "비밀번호는 8자 이상이어야 합니다.";

  if (mode === "signup") {
    if (passwordCheck !== password) errors.passwordCheck = "비밀번호가 서로 다릅니다.";
    if (!agree) errors.agree = "이용약관과 개인정보 수집에 동의해 주세요.";
  }
  return errors;
}

/** Supabase가 영어로 돌려주는 오류를 한국어로 바꾼다. */
function toKoreanMessage(message: string): string {
  if (message.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 맞지 않습니다.";
  if (message.includes("already registered")) return "이미 가입된 이메일입니다.";
  if (message.includes("Email not confirmed")) return "이메일 인증을 먼저 완료해 주세요.";
  return "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const isLogin = mode === "login";

  const [memberType, setMemberType] = useState<MemberType>("founder");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  function goAfterLogin(type: MemberType) {
    router.push(type === "founder" ? "/map" : "/partner");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(mode, email, password, passwordCheck, agree);
    setErrors(found);
    setNotice("");
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    const supabase = getSupabase();

    // 데모 모드: 입력만 검사하고 가짜 세션을 저장한다.
    if (!supabase) {
      saveSession({ email: email.trim(), memberType, demo: true });
      goAfterLogin(memberType);
      return;
    }

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setErrors({ form: toKoreanMessage(error.message) });
        setLoading(false);
        return;
      }
      const savedType = data.user?.user_metadata?.member_type as MemberType | undefined;
      const type = savedType ?? memberType;
      saveSession({ email: email.trim(), memberType: type, demo: false });
      goAfterLogin(type);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { member_type: memberType } },
    });
    if (error) {
      setErrors({ form: toKoreanMessage(error.message) });
      setLoading(false);
      return;
    }
    if (!data.session) {
      // 이메일 인증을 켜 둔 프로젝트는 세션을 바로 주지 않는다.
      setNotice("인증 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.");
      setLoading(false);
      return;
    }
    saveSession({ email: email.trim(), memberType, demo: false });
    goAfterLogin(memberType);
  }

  function handleSocial(name: string) {
    setNotice(`${name} 로그인은 준비 중입니다. 이메일로 시작해 주세요.`);
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <div className={styles.head}>
          <h1 className={styles.title}>{isLogin ? "로그인" : "회원가입"}</h1>
          <p className={styles.subtitle}>
            {isLogin ? "저장한 공실과 견적을 이어서 봅니다" : "공실 탐색부터 견적까지 한 번에 시작합니다"}
          </p>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>{isLogin ? "이용 유형" : "회원 유형"}</span>
          <div className={styles.segment} role="radiogroup" aria-label="회원 유형">
            {MEMBER_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={memberType === type}
                className={memberType === type ? `${styles.segmentItem} ${styles.segmentActive}` : styles.segmentItem}
                onClick={() => setMemberType(type)}
              >
                {MEMBER_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className={styles.kakao} onClick={() => handleSocial("카카오")}>
          카카오로 시작하기
        </button>
        <button type="button" className={styles.naver} onClick={() => handleSocial("네이버")}>
          네이버로 시작하기
        </button>

        <div className={styles.divider}>
          <span className={styles.line} />
          <span className={styles.dividerText}>이메일 {isLogin ? "로그인" : "가입"}</span>
          <span className={styles.line} />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="auth-email">이메일</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            className={errors.email ? `${styles.input} ${styles.inputError}` : styles.input}
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <p className={styles.error}>{errors.email}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="auth-password">비밀번호</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            className={errors.password ? `${styles.input} ${styles.inputError}` : styles.input}
            placeholder="8자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <p className={styles.error}>{errors.password}</p>}
        </div>

        {!isLogin && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-password-check">비밀번호 확인</label>
              <input
                id="auth-password-check"
                type="password"
                autoComplete="new-password"
                className={errors.passwordCheck ? `${styles.input} ${styles.inputError}` : styles.input}
                placeholder="비밀번호를 한 번 더 입력"
                value={passwordCheck}
                onChange={(e) => setPasswordCheck(e.target.value)}
              />
              {errors.passwordCheck && <p className={styles.error}>{errors.passwordCheck}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.agree}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                이용약관 및 개인정보 수집·이용 동의 (필수)
              </label>
              {errors.agree && <p className={styles.error}>{errors.agree}</p>}
            </div>
          </>
        )}

        {errors.form && <p className={styles.error}>{errors.form}</p>}
        {notice && <p className={styles.notice} role="status">{notice}</p>}

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? "처리 중" : isLogin ? "로그인" : "회원가입"}
        </button>

        <p className={styles.switch}>
          {isLogin ? "계정이 없으면" : "이미 계정이 있으면"}
          <Link href={isLogin ? "/signup" : "/login"} className={styles.switchLink}>
            {isLogin ? "회원가입" : "로그인"}
          </Link>
        </p>

        {isDemoMode && <p className={styles.demo}>데모 모드: 입력만 검사하고 이 브라우저에만 로그인 상태를 저장합니다.</p>}
      </form>
    </main>
  );
}
