// 어댑터 묶음. 환경변수가 없으면 가짜 구현을 고른다.
import { FakeImageEmbedder, ImageEmbedder } from "./imageEmbedder";
import { FakeImageGenerator, ImageGenerator } from "./imageGenerator";
import { FakeLinkChecker, LinkChecker } from "./linkChecker";
import { FakeObjectDetector, ObjectDetector } from "./objectDetector";
import { FakeProgressPublisher, FirestoreProgressPublisher, ProgressPublisher } from "./progressPublisher";
import { FakeShopSearch, ShopSearch } from "./shopSearch";
import { Database, FakeDatabase, SupabaseDatabase } from "./supabaseClient";

export interface Adapters {
  db: Database;
  imageGenerator: ImageGenerator;
  detector: ObjectDetector;
  embedder: ImageEmbedder;
  shopSearches: ShopSearch[];
  linkChecker: LinkChecker;
  progress: ProgressPublisher;
}

export function createAdapters(): Adapters {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = supabaseUrl && supabaseKey ? new SupabaseDatabase(supabaseUrl, supabaseKey) : new FakeDatabase();

  // Cloud Functions나 에뮬레이터 안에서만 Firestore에 쓴다. 로컬 스크립트에서는 가짜로 대신한다.
  const insideFirebase = Boolean(process.env.FUNCTION_TARGET || process.env.FIRESTORE_EMULATOR_HOST);
  const progress = insideFirebase ? new FirestoreProgressPublisher() : new FakeProgressPublisher();

  // TODO: IMAGE_GEN_API_KEY, NAVER_*, COUPANG_* 환경변수가 있을 때 고르는 실제 구현을 추가한다.
  // 지금은 값이 있어도 가짜를 쓴다. 외부 서비스를 아직 정하지 않았다.
  return {
    db,
    imageGenerator: new FakeImageGenerator(),
    detector: new FakeObjectDetector(),
    embedder: new FakeImageEmbedder(),
    shopSearches: [new FakeShopSearch("naver"), new FakeShopSearch("coupang")],
    linkChecker: new FakeLinkChecker(),
    progress,
  };
}
