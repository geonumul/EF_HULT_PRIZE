// runRenderJob의 본체. 7단계를 순서대로 실행하고 단계마다 진행률을 남긴다.
import type { Adapters } from "../adapters";
import { buildLayout } from "../pipeline/layout";
import { buildQuote } from "../pipeline/quote";
import { unitsFromProducts, unitsFromTemplate } from "../pipeline/template";
import type { JobStatus, Product, RenderJobRequest, Room } from "../types";
import { countByCategory, itemsFromDetection, itemsFromSelectedProducts } from "./renderItems";

export async function executeRenderJob(request: RenderJobRequest, adapters: Adapters): Promise<void> {
  const { db, progress } = adapters;

  const report = async (status: JobStatus, percent: number, error: string | null = null) => {
    await db.updateJob(request.jobId, { status, progress: percent, error });
    await progress.publish(request.jobId, status, percent);
  };

  try {
    await report("running", 5);
    await runSteps(request, adapters, report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await report("failed", 0, message);
    throw error;
  }
}

type Report = (status: JobStatus, percent: number) => Promise<void>;

async function runSteps(request: RenderJobRequest, adapters: Adapters, report: Report): Promise<void> {
  const { db, imageGenerator, detector, embedder } = adapters;

  // 1. 공간 정보 읽기
  const room = await readRoom(adapters, request.listingId);
  await report("running", 10);

  // 2. 배치 생성
  const catalog = await db.listProducts();
  const selected = request.mode === "products" ? await readSelectedProducts(adapters, request.productIds) : [];
  const units =
    request.mode === "products"
      ? unitsFromProducts(selected)
      : unitsFromTemplate(request.useType, room, catalog).units;
  if (units.length === 0) throw new Error("배치할 집기가 없습니다. 이 업종에 맞는 상품이 상품 목록에 있는지 확인하세요.");
  await report("running", 25);

  // 3. 치수 검증. 미달이면 buildLayout이 최대 3번 다시 배치한다.
  const { layout, violations } = buildLayout(room, units, request.mode);
  if (violations.length > 0) {
    throw new Error(`치수 검증에 실패했습니다. ${violations.map((violation) => violation.message).join(" ")}`);
  }
  await report("running", 40);

  // 4. 이미지 생성
  const image = await imageGenerator.generate({
    prompt: request.prompt,
    room,
    placed: layout.placed,
    referenceImageUrls: selected.map((product) => product.imageUrl),
  });
  await report("running", 65);

  // 5. 상품 매칭. products 모드는 상품 id가 곧 태그라 건너뛴다.
  const items =
    request.mode === "products"
      ? itemsFromSelectedProducts(room, layout, selected)
      : await itemsFromDetection({ db, detector, embedder }, image.bytes, countByCategory(layout, catalog));
  await report("running", 80);

  // 6. 견적 산출
  const quoteProducts = await db.getProductsByIds(items.flatMap((item) => (item.productId ? [item.productId] : [])));
  const quote = buildQuote(items, quoteProducts);
  await report("running", 90);

  // 7. 결과 저장
  const imageUrl = await db.uploadRenderImage(request.jobId, image.bytes, image.contentType);
  const renderId = await db.saveRender({
    listingId: request.listingId,
    useType: request.useType,
    mode: request.mode,
    prompt: request.prompt,
    imageUrl,
    quote,
    items,
  });
  await db.updateJob(request.jobId, { status: "done", progress: 100, resultRenderId: renderId, error: null });
  await adapters.progress.publish(request.jobId, "done", 100);
}

async function readRoom(adapters: Adapters, listingId: string): Promise<Room> {
  const room = await adapters.db.getRoom(listingId);
  if (!room) throw new Error(`공간 정보를 찾지 못했습니다: ${listingId}`);
  return room;
}

/** 같은 id가 여러 번 들어 있으면 그 수만큼 상품을 늘린다. */
async function readSelectedProducts(adapters: Adapters, productIds: string[]): Promise<Product[]> {
  const found = await adapters.db.getProductsByIds([...new Set(productIds)]);
  return productIds.map((id) => {
    const product = found.find((candidate) => candidate.id === id);
    if (!product) throw new Error(`상품을 찾지 못했습니다: ${id}`);
    return product;
  });
}
