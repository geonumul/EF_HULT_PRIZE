// Cloud Functions 진입점. 함수 본체는 jobs/ 폴더에 있다.
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { createAdapters } from "./adapters";
import { executeCollect } from "./jobs/collectJob";
import { executeLinkCheck } from "./jobs/linkCheckJob";
import { executeRenderJob } from "./jobs/renderJob";
import type { RenderJobRequest } from "./types";

const REGION = "asia-northeast3";
const SCHEDULE_TIME_ZONE = "Asia/Seoul";

/** Cloud Tasks 큐가 호출하는 렌더링 작업. 큐의 서비스 계정만 호출할 수 있다. */
export const runRenderJob = onRequest(
  { region: REGION, invoker: "private", timeoutSeconds: 540, memory: "1GiB" },
  async (req, res) => {
    const request = parseRenderJobRequest(req.body);
    if (!request) {
      res.status(400).json({ ok: false, error: "본문 형식이 맞지 않습니다." });
      return;
    }

    try {
      await executeRenderJob(request, createAdapters());
      res.status(200).json({ ok: true });
    } catch (error) {
      // 실패는 render_jobs.error에 남았다. 같은 작업을 큐가 다시 보내지 않도록 200으로 답한다.
      logger.error("렌더링 작업 실패", { jobId: request.jobId, error: String(error) });
      res.status(200).json({ ok: false });
    }
  },
);

/** 매일 새벽 판매처 링크의 상태와 가격을 다시 확인한다. */
export const checkProductLinks = onSchedule(
  { region: REGION, schedule: "0 4 * * *", timeZone: SCHEDULE_TIME_ZONE, timeoutSeconds: 540 },
  async () => {
    const summary = await executeLinkCheck(createAdapters());
    logger.info("링크 점검 완료", summary);
  },
);

/** 매일 네이버 쇼핑과 쿠팡 파트너스에서 상품을 모은다. */
export const collectProducts = onSchedule(
  { region: REGION, schedule: "0 3 * * *", timeZone: SCHEDULE_TIME_ZONE, timeoutSeconds: 540 },
  async () => {
    const summary = await executeCollect(createAdapters());
    logger.info("상품 수집 완료", summary);
  },
);

function parseRenderJobRequest(body: unknown): RenderJobRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const data = body as Partial<RenderJobRequest>;

  const validMode = data.mode === "text" || data.mode === "products";
  const validIds = Array.isArray(data.productIds) && data.productIds.every((id) => typeof id === "string");
  if (!data.jobId || !data.listingId || !data.useType || !validMode || !validIds) return null;

  return {
    jobId: data.jobId,
    listingId: data.listingId,
    useType: data.useType,
    mode: data.mode as RenderJobRequest["mode"],
    prompt: data.prompt ?? "",
    productIds: data.productIds ?? [],
  };
}
