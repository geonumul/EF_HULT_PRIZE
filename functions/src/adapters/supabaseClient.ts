// Supabase 어댑터. 작업 상태, 공간, 상품, 결과 저장을 Database 하나로 묶는다.
// 환경변수가 없으면 메모리에서 도는 FakeDatabase를 쓴다.
import type { DesignNote } from "../pipeline/legal";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedItem } from "../pipeline/normalize";
import type { Candidate, JobStatus, Product, ProductCategory, ProductLink, Quote, RenderItem, RenderMode, Room } from "../types";
import { cosineSimilarity } from "../pipeline/matching";
import { hashToVector } from "./imageEmbedder";

export interface JobPatch {
  status?: JobStatus;
  progress?: number;
  error?: string | null;
  resultRenderId?: string | null;
}

export interface SaveRenderInput {
  listingId: string;
  useType: string;
  mode: RenderMode;
  prompt: string;
  imageUrl: string;
  quote: Quote;
  items: RenderItem[];
  /** 이 공간과 업종에서 확인할 법령, 설계 점검 항목. 아직 DB 열은 없고 가짜 DB가 보관한다. */
  notes?: DesignNote[];
}

export interface LinkPatch {
  status: ProductLink["status"];
  price: number;
  alternativeProductIds: string[];
}

export interface Database {
  updateJob(jobId: string, patch: JobPatch): Promise<void>;
  getRoom(listingId: string): Promise<Room | null>;
  /** 판매처 링크가 live인 상품 전체. 배치에 쓸 상품 후보다. */
  listProducts(): Promise<Product[]>;
  getProductsByIds(ids: string[]): Promise<Product[]>;
  /** 임베딩 유사도 높은 순으로 상품을 찾는다. (pgvector) */
  findSimilarProducts(embedding: number[], limit: number): Promise<Candidate[]>;
  /** 같은 카테고리에서 기준 상품과 임베딩이 가까운 상품 id */
  findAlternativeProductIds(productId: string, limit: number): Promise<string[]>;
  uploadRenderImage(jobId: string, bytes: Uint8Array, contentType: string): Promise<string>;
  /** renders와 render_items에 저장하고 renders.id를 돌려준다. */
  saveRender(input: SaveRenderInput): Promise<string>;
  listProductLinks(): Promise<ProductLink[]>;
  updateProductLink(linkId: string, patch: LinkPatch): Promise<void>;
  /** products와 product_links에 넣는다. 이미 있는 url이면 가격만 갱신한다. */
  saveCollectedProduct(item: NormalizedItem, embedding: number[]): Promise<void>;
}

// ---------------------------------------------------------------------------
// 가짜 구현
// ---------------------------------------------------------------------------

function seedProduct(id: string, name: string, category: ProductCategory, w: number, d: number, h: number, price: number): Product {
  // 같은 카테고리끼리 비슷하고 상품마다 조금씩 다른 임베딩
  const base = hashToVector(Buffer.from(category, "utf8"));
  const jitter = hashToVector(Buffer.from(id, "utf8"));
  const embedding = base.map((value, index) => value * 20 + jitter[index] * 0.2);
  return { id, name, category, widthMm: w, depthMm: d, heightMm: h, price, imageUrl: `https://example.com/${id}.jpg`, embedding };
}

export const SEED_PRODUCTS: Product[] = [
  seedProduct("p-chair-1", "오크 원목 체어", "chair", 450, 520, 780, 89000),
  seedProduct("p-chair-2", "블랙 철제 체어", "chair", 420, 480, 800, 69000),
  seedProduct("p-table-1", "2인 원형 테이블", "table", 600, 600, 720, 129000),
  seedProduct("p-counter-1", "바 카운터 1800", "counter", 1800, 600, 1000, 890000),
  seedProduct("p-lamp-1", "펜던트 조명", "lamp", 300, 300, 400, 59000),
  seedProduct("p-shelf-1", "진열 선반 900", "shelf", 900, 400, 1800, 149000),
  seedProduct("p-reformer-1", "필라테스 리포머", "reformer", 2400, 700, 400, 1290000),
  seedProduct("p-locker-1", "사물함 6칸", "locker", 900, 400, 1800, 239000),
];

export interface FakeJobRecord {
  status: JobStatus;
  progress: number;
  error: string | null;
  resultRenderId: string | null;
}

export class FakeDatabase implements Database {
  readonly jobs = new Map<string, FakeJobRecord>();
  readonly renders: Array<SaveRenderInput & { id: string; imageUrl: string }> = [];
  readonly links: ProductLink[];
  readonly collected: NormalizedItem[] = [];

  constructor(public readonly products: Product[] = SEED_PRODUCTS) {
    this.links = products.map((product) => ({
      id: `l-${product.id}`,
      productId: product.id,
      source: "naver" as const,
      url: `https://example.com/${product.id}`,
      affiliateUrl: null,
      price: product.price,
      status: "live" as const,
    }));
  }

  async updateJob(jobId: string, patch: JobPatch): Promise<void> {
    const current = this.jobs.get(jobId) ?? { status: "queued" as JobStatus, progress: 0, error: null, resultRenderId: null };
    this.jobs.set(jobId, {
      status: patch.status ?? current.status,
      progress: patch.progress ?? current.progress,
      error: patch.error === undefined ? current.error : patch.error,
      resultRenderId: patch.resultRenderId === undefined ? current.resultRenderId : patch.resultRenderId,
    });
  }

  // 39.6m². Figma "상품 수집·적용"의 카페 예시와 같은 크기다.
  async getRoom(_listingId: string): Promise<Room | null> {
    return { widthMm: 6600, depthMm: 6000, ceilingMm: 2700 };
  }

  async listProducts(): Promise<Product[]> {
    return this.products;
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    return this.products.filter((product) => ids.includes(product.id));
  }

  async findSimilarProducts(embedding: number[], limit: number): Promise<Candidate[]> {
    return this.products
      .map((product) => ({ productId: product.id, similarity: cosineSimilarity(embedding, product.embedding) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async findAlternativeProductIds(productId: string, limit: number): Promise<string[]> {
    const base = this.products.find((product) => product.id === productId);
    if (!base) return [];
    return this.products
      .filter((product) => product.id !== productId && product.category === base.category)
      .sort((a, b) => cosineSimilarity(base.embedding, b.embedding) - cosineSimilarity(base.embedding, a.embedding))
      .slice(0, limit)
      .map((product) => product.id);
  }

  async uploadRenderImage(jobId: string, _bytes: Uint8Array, _contentType: string): Promise<string> {
    return `fake://renders/${jobId}.png`;
  }

  async saveRender(input: SaveRenderInput): Promise<string> {
    const id = `render-${this.renders.length + 1}`;
    this.renders.push({ ...input, id });
    return id;
  }

  async listProductLinks(): Promise<ProductLink[]> {
    return this.links;
  }

  async updateProductLink(linkId: string, patch: LinkPatch): Promise<void> {
    const link = this.links.find((candidate) => candidate.id === linkId);
    if (link) {
      link.status = patch.status;
      link.price = patch.price;
    }
  }

  async saveCollectedProduct(item: NormalizedItem, _embedding: number[]): Promise<void> {
    this.collected.push(item);
  }
}

// ---------------------------------------------------------------------------
// 실제 구현
// ---------------------------------------------------------------------------

const RENDER_BUCKET = "renders";

export class SupabaseDatabase implements Database {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey);
  }

  // render_jobs 열 이름은 작업 계약에 적힌 그대로다.
  async updateJob(jobId: string, patch: JobPatch): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.progress !== undefined) row.progress = patch.progress;
    if (patch.error !== undefined) row.error = patch.error;
    if (patch.resultRenderId !== undefined) row.result_render_id = patch.resultRenderId;

    const { error } = await this.client.from("render_jobs").update(row).eq("id", jobId);
    if (error) throw new Error(`render_jobs 갱신 실패: ${error.message}`);
  }

  async uploadRenderImage(jobId: string, bytes: Uint8Array, contentType: string): Promise<string> {
    const path = `${jobId}.png`;
    const bucket = this.client.storage.from(RENDER_BUCKET);
    const { error } = await bucket.upload(path, bytes, { contentType, upsert: true });
    if (error) throw new Error(`이미지 업로드 실패: ${error.message}`);
    return bucket.getPublicUrl(path).data.publicUrl;
  }

  // TODO: 아래 메서드는 supabase/migrations의 테이블과 열이 확정되면 구현한다.
  // 열 이름을 추측해서 쓰지 않으려고 비워 두었다. 환경변수를 넣고 돌리면 이 지점에서 작업이 실패한다.
  async getRoom(_listingId: string): Promise<Room | null> {
    return notReady("공간 치수 읽기");
  }
  async listProducts(): Promise<Product[]> {
    return notReady("상품 목록 읽기");
  }
  async getProductsByIds(_ids: string[]): Promise<Product[]> {
    return notReady("상품 읽기");
  }
  async findSimilarProducts(_embedding: number[], _limit: number): Promise<Candidate[]> {
    return notReady("pgvector 유사도 검색(rpc 함수 필요)");
  }
  async findAlternativeProductIds(_productId: string, _limit: number): Promise<string[]> {
    return notReady("대체 상품 검색");
  }
  async saveRender(_input: SaveRenderInput): Promise<string> {
    return notReady("renders, render_items 저장");
  }
  async listProductLinks(): Promise<ProductLink[]> {
    return notReady("product_links 읽기");
  }
  async updateProductLink(_linkId: string, _patch: LinkPatch): Promise<void> {
    return notReady("product_links 갱신");
  }
  async saveCollectedProduct(_item: NormalizedItem, _embedding: number[]): Promise<void> {
    return notReady("수집 상품 저장");
  }
}

function notReady(what: string): never {
  throw new Error(`TODO: ${what}은(는) 스키마 확정 후 구현한다.`);
}
