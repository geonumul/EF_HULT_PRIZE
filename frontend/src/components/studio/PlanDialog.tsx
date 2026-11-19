"use client";

// 배치도와 설계 점검을 한 화면에 보여 주는 대화상자.
// preset(렌더링 응답에 들어 있던 plan)이 있으면 그대로 쓰고, 없으면 planLayout을 불러온다.
import { useEffect, useState } from "react";
import { planLayout } from "@/lib/api/functions";
import type { LayoutInput, PlanResult } from "@/lib/api/functions";
import DialogFrame from "./DialogFrame";
import LayoutPlan from "./LayoutPlan";
import DesignChecks from "./DesignChecks";
import styles from "./PlanDialog.module.css";

type Props = {
  input: LayoutInput;
  preset?: PlanResult | null;
  onClose: () => void;
};

type State = { status: "loading" } | { status: "error"; message: string } | { status: "done"; plan: PlanResult };

export default function PlanDialog({ input, preset, onClose }: Props) {
  const [state, setState] = useState<State>(preset ? { status: "done", plan: preset } : { status: "loading" });
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (preset) return;
    let cancelled = false;
    setState({ status: "loading" });
    planLayout(input).then((result) => {
      if (cancelled) return;
      if (result.ok) setState({ status: "done", plan: result.data });
      else setState({ status: "error", message: "배치도를 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요." });
    });
    return () => {
      cancelled = true;
    };
    // 열릴 때와 다시 시도할 때만 부른다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries]);

  return (
    <DialogFrame title="배치도 · 설계 점검" onClose={onClose} wide>
      {state.status === "loading" && (
        <p className={styles.message} role="status">
          배치를 계산하는 중이에요
        </p>
      )}
      {state.status === "error" && (
        <div className={styles.message} role="alert">
          <p>{state.message}</p>
          <button type="button" className={styles.retry} onClick={() => setTries(tries + 1)}>
            다시 시도
          </button>
        </div>
      )}
      {state.status === "done" && (
        <div className={styles.content}>
          <div className={styles.plan}>
            <LayoutPlan plan={state.plan} />
          </div>
          <div className={styles.checks}>
            <DesignChecks plan={state.plan} />
          </div>
        </div>
      )}
    </DialogFrame>
  );
}
