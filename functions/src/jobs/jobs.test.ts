// 가짜 어댑터로 세 작업을 끝까지 돌린다.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Adapters } from "../adapters";
import { FakeImageEmbedder } from "../adapters/imageEmbedder";
import { FakeImageGenerator } from "../adapters/imageGenerator";
import { FakeLinkChecker } from "../adapters/linkChecker";
import { FakeObjectDetector } from "../adapters/objectDetector";
import { FakeProgressPublisher } from "../adapters/progressPublisher";
import { FakeShopSearch } from "../adapters/shopSearch";
import { FakeDatabase } from "../adapters/supabaseClient";
import type { RenderJobRequest } from "../types";
import { executeCollect } from "./collectJob";
import { executeLinkCheck } from "./linkCheckJob";
import { executeRenderJob } from "./renderJob";

function makeAdapters() {
  const db = new FakeDatabase();
  const progress = new FakeProgressPublisher();
  const adapters: Adapters = {
    db,
    imageGenerator: new FakeImageGenerator(),
    detector: new FakeObjectDetector(),
    embedder: new FakeImageEmbedder(),
    shopSearches: [new FakeShopSearch("naver"), new FakeShopSearch("coupang")],
    linkChecker: new FakeLinkChecker(),
    progress,
  };
  return { adapters, db, progress };
}

const textJob: RenderJobRequest = { jobId: "j1", listingId: "l1", useType: "cafe", mode: "text", prompt: "따뜻한 카페", productIds: [] };

describe("executeRenderJob", () => {
  it("text 모드는 7단계를 지나 done 100으로 끝나고 결과를 저장한다", async () => {
    const { adapters, db, progress } = makeAdapters();
    await executeRenderJob(textJob, adapters);

    assert.deepEqual(db.jobs.get("j1")?.status, "done");
    assert.equal(db.jobs.get("j1")?.progress, 100);
    assert.equal(db.jobs.get("j1")?.resultRenderId, "render-1");
    assert.equal(db.renders.length, 1);

    const percents = progress.published.map((entry) => entry.progress);
    assert.deepEqual(percents, [...percents].sort((a, b) => a - b));
    assert.equal(percents[percents.length - 1], 100);
  });

  it("text 모드는 매칭한 상품에 태그를 달고 견적을 만든다", async () => {
    const { adapters, db } = makeAdapters();
    await executeRenderJob(textJob, adapters);
    const saved = db.renders[0];
    assert.ok(saved.items.some((item) => item.productId !== null && item.tag !== null));
    assert.ok(saved.quote.productsTotal > 0);
  });

  it("products 모드는 고른 상품이 태그가 된다", async () => {
    const { adapters, db } = makeAdapters();
    const job: RenderJobRequest = { ...textJob, jobId: "j2", mode: "products", productIds: ["p-table-1", "p-table-1", "p-counter-1"] };
    await executeRenderJob(job, adapters);

    const items = db.renders[0].items;
    assert.deepEqual(items.map((item) => [item.productId, item.qty, item.matchType]), [
      ["p-table-1", 2, "selected"],
      ["p-counter-1", 1, "selected"],
    ]);
  });

  it("공간에 들어가지 않는 상품이 있으면 failed로 끝나고 이유를 남긴다", async () => {
    const { adapters, db, progress } = makeAdapters();
    const ids = Array.from({ length: 40 }, () => "p-reformer-1");
    const job: RenderJobRequest = { ...textJob, jobId: "j3", mode: "products", productIds: ids };

    await assert.rejects(executeRenderJob(job, adapters));
    assert.equal(db.jobs.get("j3")?.status, "failed");
    assert.match(db.jobs.get("j3")?.error ?? "", /필라테스 리포머/);
    assert.equal(progress.published.at(-1)?.status, "failed");
  });

  it("없는 상품 id는 failed로 끝난다", async () => {
    const { adapters, db } = makeAdapters();
    await assert.rejects(executeRenderJob({ ...textJob, jobId: "j4", mode: "products", productIds: ["nope"] }, adapters));
    assert.equal(db.jobs.get("j4")?.status, "failed");
  });
});

describe("executeLinkCheck", () => {
  it("모든 링크를 확인한다", async () => {
    const { adapters, db } = makeAdapters();
    const summary = await executeLinkCheck(adapters);
    assert.equal(summary.checked, db.links.length);
    assert.equal(summary.changedStatus, 0);
  });
});

describe("executeCollect", () => {
  it("검색 결과를 정규화해서 저장하고 치수 없는 상품을 센다", async () => {
    const { adapters, db } = makeAdapters();
    const summary = await executeCollect(adapters);
    assert.equal(summary.collected, db.collected.length);
    assert.ok(summary.needsSupplierDimensions > 0);
    assert.ok(summary.needsSupplierDimensions < summary.collected);
  });
});
