// S11 입점·제휴 문의. Figma 42:521. 소개 글은 이 파일에 두고, 문의 폼만 클라이언트 컴포넌트로 뺐다.
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import InquiryForm from "@/components/partner/InquiryForm";
import styles from "./page.module.css";

const TYPES = [
  {
    name: "집기·자재 공급사",
    fee: "판매 수수료 10% 내외 (품목별 협의)",
    text: "렌더링에 쓰인 상품이 견적서 항목과 집기 마켓에 노출됩니다. 신품, 중고, 대여 모두 등록할 수 있습니다.",
    example: "취급 예시: 의자·테이블, 조명, 주방 설비, 운동 기구, 바닥·벽 자재",
  },
  {
    name: "시공사",
    fee: "계약 성사 시 시공비의 3%",
    text: "견적 확정 고객에게 시공 견적 요청이 전달됩니다. 공사 기간과 평균 단가가 견적에 반영됩니다.",
    example: "취급 예시: 인테리어, 전기·설비, 간판, 철거",
  },
  {
    name: "중개사·임대인",
    fee: "등록 무료 · 상단 노출 월 9.9만 원",
    text: "공실을 등록하면 업종 진단과 렌더링이 자동으로 붙습니다.",
    example: "취급 예시: 상가 공실, 팝업용 단기 공간",
  },
];

const STEPS = [
  "문의 접수",
  "사업자·상품 확인 (3영업일)",
  "상품 등록 (CSV 일괄, 판매처 링크, API 연동)",
  "렌더링·견적 노출 시작",
];

const FAQS = [
  { q: "정산은 언제 되나요?", a: "구매 확정 후 다음 달 10일에 지난달 판매분을 정산합니다." },
  { q: "중고 집기도 올릴 수 있나요?", a: "상태 등급(A·B)과 실사진 3장 이상이 있으면 등록됩니다." },
  { q: "자사몰이나 스마트스토어 상품을 그대로 쓸 수 있나요?", a: "판매처 링크를 등록하면 렌더링 태그와 견적서에서 그 링크로 연결합니다." },
];

export default function PartnerApplyPage() {
  return (
    <>
      <main>
        <section className={styles.hero}>
          <div className={styles.inner}>
            <p className={styles.eyebrow}>PARTNERS</p>
            <h1 className={styles.heroTitle}>입점·제휴 안내</h1>
            <p className={styles.heroText}>
              집기·자재 공급사, 시공사, 중개사가 렌더링과 견적에 상품과 서비스를 올립니다. 예비 창업자가 렌더링 속 상품을 고르면 판매처로 바로 연결됩니다.
            </p>
            <div className={styles.heroCtas}>
              <a href="#inquiry" className={styles.ctaPrimary}>입점 문의 작성</a>
              <a href="#process" className={styles.ctaSecondary}>상품 등록 가이드</a>
            </div>
          </div>
        </section>

        <section className={`${styles.inner} ${styles.body}`}>
          <div className={styles.info}>
            <div className={styles.block}>
              <h2 className={styles.heading}>입점 유형</h2>
              {TYPES.map((type) => (
                <div key={type.name} className={styles.typeCard}>
                  <div className={styles.typeHead}>
                    <strong className={styles.typeName}>{type.name}</strong>
                    <span className={styles.fee}>{type.fee}</span>
                  </div>
                  <p className={styles.typeText}>{type.text}</p>
                  <p className={styles.typeExample}>{type.example}</p>
                </div>
              ))}
            </div>

            <div id="process" className={styles.block}>
              <h2 className={styles.heading}>입점 절차</h2>
              {STEPS.map((step, index) => (
                <div key={step} className={styles.step}>
                  <span className={index === STEPS.length - 1 ? `${styles.stepNumber} ${styles.stepLast}` : styles.stepNumber}>
                    {index + 1}
                  </span>
                  <span className={styles.stepText}>{step}</span>
                </div>
              ))}
            </div>

            <div className={styles.faqBlock}>
              <h2 className={styles.heading}>자주 묻는 질문</h2>
              {FAQS.map((faq) => (
                <div key={faq.q} className={styles.faq}>
                  <p className={styles.faqQuestion}>{faq.q}</p>
                  <p className={styles.faqAnswer}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <InquiryForm />
        </section>

        <section className={styles.closing}>
          <p className={styles.closingTitle}>빈 상가 사진 한 장으로 업종별 창업비까지</p>
          <p className={styles.closingText}>공실 탐색, 렌더링, 견적은 무료입니다</p>
          <div className={styles.heroCtas}>
            <Link href="/map" className={styles.ctaPrimaryLarge}>공실 지도 보기</Link>
            <a href="#inquiry" className={styles.ctaOutline}>입점 문의</a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
