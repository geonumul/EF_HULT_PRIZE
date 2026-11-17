"use client";

// S11 입점 문의 폼. Figma 42:604. 제출하면 같은 자리가 완료 화면으로 바뀐다.
// 입점 방식(링크형, 입점형, 시공 연결형)은 시안 폼에 없고, Figma "09 API · 상품 연결"의 입점 방식 표를 따라 더했다.
// 문의는 서버 대신 localStorage에 쌓는다.
import { useState, type FormEvent } from "react";
import { newId } from "./partnerStorage";
import styles from "./InquiryForm.module.css";

type CompanyType = "공급사" | "시공사" | "중개사·임대인";
type Model = "링크형" | "입점형" | "시공 연결형";

const COMPANY_TYPES: CompanyType[] = ["공급사", "시공사", "중개사·임대인"];

// 표의 "방식"과 "수익" 줄을 한 문장으로 줄였다.
const MODELS: { name: Model; desc: string }[] = [
  { name: "링크형", desc: "판매처 링크만 등록합니다. 주문과 배송은 판매처가 처리하고, 수익은 제휴 수수료입니다." },
  { name: "입점형", desc: "Shopportunity에서 주문·결제합니다. 공급사가 배송·설치하고 판매 수수료는 10% 내외입니다." },
  { name: "시공 연결형", desc: "견적 확정 고객의 시공 요청을 3곳까지 전달합니다. 계약 성사 시 시공비의 3%입니다." },
];

// 업체 유형을 고르면 어울리는 입점 방식을 미리 골라 준다. 사용자가 다시 바꿀 수 있다.
const DEFAULT_MODEL: Record<CompanyType, Model> = {
  공급사: "입점형",
  시공사: "시공 연결형",
  "중개사·임대인": "링크형",
};

const ITEMS = ["의자·테이블", "조명", "주방 설비", "운동 기구", "진열·수납", "바닥·벽 자재", "시공", "철거 전문"];

type Errors = Partial<Record<"name" | "manager" | "phone" | "email" | "link" | "items" | "message" | "agree", string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const LINK_PATTERN = /^https?:\/\/\S+\.\S+$/;

export default function InquiryForm() {
  const [companyType, setCompanyType] = useState<CompanyType>("공급사");
  const [model, setModel] = useState<Model>("입점형");
  const [name, setName] = useState("");
  const [manager, setManager] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  // 링크형과 입점형은 판매처 링크가 필수다. (판매처 링크가 없는 상품은 렌더링에 쓰지 않는다)
  const linkRequired = model !== "시공 연결형";

  function pickCompanyType(type: CompanyType) {
    setCompanyType(type);
    setModel(DEFAULT_MODEL[type]);
  }

  function toggleItem(item: string) {
    setItems(items.includes(item) ? items.filter((i) => i !== item) : [...items, item]);
  }

  function validate(): Errors {
    const found: Errors = {};
    if (!name.trim()) found.name = "업체명을 입력해 주세요.";
    if (!manager.trim()) found.manager = "담당자 이름을 입력해 주세요.";
    if (!phone.trim()) found.phone = "연락처를 입력해 주세요.";
    else if (!PHONE_PATTERN.test(phone.trim())) found.phone = "010-0000-0000 형식으로 입력해 주세요.";
    if (!email.trim()) found.email = "이메일을 입력해 주세요.";
    else if (!EMAIL_PATTERN.test(email.trim())) found.email = "이메일 형식이 올바르지 않습니다.";
    if (link.trim() === "" && linkRequired) found.link = "판매처 링크를 입력해 주세요.";
    else if (link.trim() !== "" && !LINK_PATTERN.test(link.trim())) found.link = "http:// 또는 https://로 시작하는 주소를 입력해 주세요.";
    if (items.length === 0) found.items = "취급 품목을 1개 이상 골라 주세요.";
    if (message.trim().length < 10) found.message = "문의 내용을 10자 이상 적어 주세요.";
    if (!agree) found.agree = "개인정보 수집·이용에 동의해 주세요.";
    return found;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    saveInquiry();
    setDone(true);
  }

  function saveInquiry() {
    const inquiry = {
      id: newId("inq"),
      companyType,
      model,
      name: name.trim(),
      manager: manager.trim(),
      phone: phone.trim(),
      email: email.trim(),
      link: link.trim(),
      items,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };
    try {
      const saved = JSON.parse(localStorage.getItem("partner-inquiries") ?? "[]");
      localStorage.setItem("partner-inquiries", JSON.stringify([inquiry, ...saved]));
    } catch {
      // 저장소가 막혀 있어도 접수 화면은 보여 준다.
    }
  }

  function reset() {
    setCompanyType("공급사");
    setModel("입점형");
    setName("");
    setManager("");
    setPhone("");
    setEmail("");
    setLink("");
    setItems([]);
    setMessage("");
    setAgree(false);
    setErrors({});
    setDone(false);
  }

  function inputClass(field: keyof Errors): string {
    return errors[field] ? `${styles.input} ${styles.inputError}` : styles.input;
  }

  if (done) {
    return (
      <div id="inquiry" className={styles.card}>
        <h2 className={styles.title}>문의가 접수되었습니다</h2>
        <p className={styles.doneText}>
          {name.trim()}의 {model} 입점 문의를 받았습니다. 담당자가 3영업일 안에 {email.trim()} 또는 {phone.trim()}으로 연락드립니다.
        </p>
        <button type="button" className={styles.secondary} onClick={reset}>
          다른 문의 작성
        </button>
      </div>
    );
  }

  return (
    <form id="inquiry" className={styles.card} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.title}>입점 문의</h2>

      <div className={styles.field}>
        <span className={styles.label}>업체 유형</span>
        <div className={styles.row}>
          {COMPANY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={companyType === type}
              className={companyType === type ? `${styles.choice} ${styles.choiceOn}` : styles.choice}
              onClick={() => pickCompanyType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>입점 방식</span>
        <div className={styles.row}>
          {MODELS.map((item) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={model === item.name}
              className={model === item.name ? `${styles.choice} ${styles.choiceOn}` : styles.choice}
              onClick={() => setModel(item.name)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <p className={styles.hint}>{MODELS.find((m) => m.name === model)?.desc}</p>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="inq-name">업체명 <span className={styles.required}>필수</span></label>
        <input id="inq-name" className={inputClass("name")} placeholder="예: 마켓B" value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <p className={styles.error}>{errors.name}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="inq-manager">담당자 · 연락처 <span className={styles.required}>필수</span></label>
        <div className={styles.row}>
          <input id="inq-manager" className={inputClass("manager")} placeholder="이름" value={manager} onChange={(e) => setManager(e.target.value)} />
          <input aria-label="연락처" className={inputClass("phone")} placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {errors.manager && <p className={styles.error}>{errors.manager}</p>}
        {errors.phone && <p className={styles.error}>{errors.phone}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="inq-email">이메일 <span className={styles.required}>필수</span></label>
        <input id="inq-email" type="email" className={inputClass("email")} placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        {errors.email && <p className={styles.error}>{errors.email}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="inq-link">
          판매처 링크 {linkRequired ? <span className={styles.required}>필수</span> : <span className={styles.optional}>선택</span>}
        </label>
        <input id="inq-link" className={inputClass("link")} placeholder="자사몰, 스마트스토어 주소" value={link} onChange={(e) => setLink(e.target.value)} />
        {errors.link && <p className={styles.error}>{errors.link}</p>}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>취급 품목 <span className={styles.required}>필수</span></span>
        <div className={styles.chips}>
          {ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={items.includes(item)}
              className={items.includes(item) ? `${styles.chip} ${styles.chipOn}` : styles.chip}
              onClick={() => toggleItem(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {errors.items && <p className={styles.error}>{errors.items}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="inq-message">문의 내용 <span className={styles.required}>필수</span></label>
        <textarea
          id="inq-message"
          className={`${inputClass("message")} ${styles.textarea}`}
          placeholder="등록할 상품 수, 중고 여부, 배송 가능 지역"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {errors.message && <p className={styles.error}>{errors.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.agree}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          개인정보 수집·이용 동의 (필수)
        </label>
        {errors.agree && <p className={styles.error}>{errors.agree}</p>}
      </div>

      <button type="submit" className={styles.submit}>문의 보내기</button>
      <p className={styles.footnote}>담당자가 3영업일 안에 연락드립니다</p>
    </form>
  );
}
