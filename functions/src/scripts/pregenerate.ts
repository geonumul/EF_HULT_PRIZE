// 시연용 렌더링을 미리 만든다. 공간 사진과 실측 치수, 업종을 주면 배치를 계산하고 Gemini로 이미지를 여러 장 뽑아 저장한다.
// 같은 조건으로 여러 장 뽑아서 가장 잘 나온 것을 골라 쓴다.
//
// 실행 (functions 폴더에서, 먼저 npm run build):
//   node lib/scripts/pregenerate.js --photo C:/사진/space.jpg --use cafe --width 6000 --depth 6600 --ceiling 3200 --count 3 --out C:/결과
//   --structure 구조그림.png  : tools/clay_render.py로 만든 점토 렌더링. 원근과 물건 위치를 정확히 따르게 한다.
//   --refs "체어=a.jpg,조명=b.jpg" : 상품 사진. 그 상품의 생김새로 그리게 한다.
//   --layout 도면.json : functions/tools/plans-src의 도면(방 크기와 가구 위치)을 그대로 쓴다. --width, --depth는 필요 없다.
//   --structure-kind guide : --structure가 tools/guide_render.py가 만든 가이드(건축 선화 + 가구 색 상자)일 때. --aspect 3:2 처럼 사진 비율을 함께 준다.
//   --structure-kind edges : --structure가 tools/edge_map.py로 만든 건축 요소 선화일 때. 창, 기둥, 보, 천장 구조를 같은 자리에 둔다.
//   --attempts N : 만든 이미지를 설계 기준 체크리스트로 자동 검수하고, 실패하면 최대 N번까지 다시 만들어 가장 나은 것을 저장한다.
//   --critic     : 다시 만들지 않고 검수 결과만 남긴다.
//   --restyle  : --photo가 이미 꾸며진 기준 이미지일 때, 구도는 그대로 두고 --prompt의 스타일로만 바꾼다.
//   --dry-run 을 붙이면 키 없이 배치와 프롬프트만 출력한다.
// 키는 functions/.env의 GEMINI_API_KEY 에서 읽는다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { GeminiCritic, type CritiqueResult } from "../adapters/geminiCritic";
import { GeminiImageGenerator, buildPrompt } from "../adapters/geminiImageGenerator";
import type { ImageGenerationRequest } from "../adapters/imageGenerator";
import { FakeDatabase } from "../adapters/supabaseClient";
import { buildLayout, type PlacedItem } from "../pipeline/layout";
import { zonedPacker } from "../pipeline/zoning";
import { legalNotes } from "../pipeline/legal";
import { unitsFromTemplate } from "../pipeline/template";

function readImage(path: string): { bytes: Uint8Array; contentType: string } {
  const file = resolve(path);
  const contentType = MIME_BY_EXTENSION[extname(file).toLowerCase()];
  if (!existsSync(file) || !contentType) throw new Error(`이미지를 읽을 수 없습니다(jpg, png, webp만): ${file}`);
  return { bytes: readFileSync(file), contentType };
}

const MIME_BY_EXTENSION: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function readArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[argv[i].slice(2)] = "true";
    else {
      args[argv[i].slice(2)] = next;
      i++;
    }
  }
  return args;
}

function requireNumber(args: Record<string, string>, name: string): number {
  const value = Number(args[name]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${name} 숫자(mm)가 필요합니다.`);
  return value;
}

async function main() {
  const envFile = resolve(__dirname, "../../.env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const args = readArgs(process.argv.slice(2));
  const useType = args.use ?? "cafe";
  const room = args.layout
    ? { widthMm: 1, depthMm: 1, ceilingMm: requireNumber(args, "ceiling") } // --layout이면 도면의 방 크기를 쓴다.
    : { widthMm: requireNumber(args, "width"), depthMm: requireNumber(args, "depth"), ceilingMm: requireNumber(args, "ceiling") };
  const count = Number(args.count ?? 3);
  const dryRun = args["dry-run"] === "true";

  // 배치를 계산하고 치수 검증을 통과하는지 확인한다.
  // --layout 도면.json: tools/plans-src의 도면을 그대로 쓴다(사진에서 보정한 카메라로 가이드를 그릴 때). 없으면 업종 기본 구성을 계산한다.
  let layout: { placed: PlacedItem[]; unplaced: unknown[] };
  let violations: Array<{ message: string }> = [];
  if (args.layout) {
    const plan = JSON.parse(readFileSync(resolve(args.layout), "utf8"));
    layout = { placed: plan.placed, unplaced: [] };
    Object.assign(room, plan.room);
  } else {
    const catalog = await new FakeDatabase().listProducts();
    const { units } = unitsFromTemplate(useType, room, catalog);
    const built = buildLayout(room, units, "text", zonedPacker(useType));
    layout = built.layout;
    violations = built.violations;
  }
  console.log(`배치 ${layout.placed.length}개, 놓지 못한 물건 ${layout.unplaced.length}개, 치수 위반 ${violations.length}건`);
  for (const violation of violations) console.log(`  - ${violation.message}`);

  for (const note of legalNotes(room, useType)) console.log(`  [${note.level === "error" ? "문제" : "확인"}] ${note.text}`);

  let spacePhoto: ImageGenerationRequest["spacePhoto"];
  if (args.photo) {
    const photoPath = resolve(args.photo);
    const contentType = MIME_BY_EXTENSION[extname(photoPath).toLowerCase()];
    if (!existsSync(photoPath) || !contentType) throw new Error(`사진을 읽을 수 없습니다(jpg, png, webp만): ${photoPath}`);
    spacePhoto = { bytes: readFileSync(photoPath), contentType };
  }

  // --structure 점토 렌더링 그림, --refs "이름=경로,이름=경로" 상품 사진
  const structureImage = args.structure ? readImage(args.structure) : undefined;
  const referenceImages = args.refs
    ? args.refs.split(",").map((pair) => {
        const [label, path] = pair.split("=");
        return { label, ...readImage(path) };
      })
    : undefined;
  const request: ImageGenerationRequest = {
    prompt: args.prompt ?? "",
    useType,
    room,
    placed: layout.placed,
    referenceImageUrls: [],
    spacePhoto,
    structureImage,
    referenceImages,
    mode: args.restyle === "true" ? "restyle" : undefined,
    structureKind: args["structure-kind"] === "edges" ? "edges" : args["structure-kind"] === "guide" ? "guide" : undefined,
    aspectRatio: args.aspect,
  };
  if (dryRun) {
    console.log("\n--- 프롬프트 ---\n" + buildPrompt(request));
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 없습니다. functions/.env에 넣어 주세요.");
  const outDir = resolve(args.out ?? "renders-out");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${useType}-layout.json`), JSON.stringify({ room, placed: layout.placed }, null, 2));

  const generator = new GeminiImageGenerator(apiKey, process.env.GEMINI_IMAGE_MODEL || undefined);
  // --attempts N: 기준표 체크리스트로 자동 검수하고, 실패하면 최대 N번까지 다시 만들어 가장 나은 것을 저장한다.
  const attempts = Math.max(1, Number(args.attempts ?? 1));
  const critic = attempts > 1 || args.critic === "true" ? new GeminiCritic(apiKey, process.env.GEMINI_CRITIC_MODEL || undefined) : null;

  for (let n = 1; n <= count; n++) {
    let best: { image: Awaited<ReturnType<typeof generator.generate>>; result: CritiqueResult | null } | null = null;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const image = await generator.generate(request);
        const result = critic ? await critic.critique({ image, original: spacePhoto, useType }) : null;
        if (result) {
          const failedText = result.failed.map((item) => `${item.id}: ${item.note}`).join(" / ");
          console.log(`  시도 ${attempt}: ${result.passed ? "통과" : "실패"} (통과 ${result.score}/${result.items.length})${failedText ? ` ${failedText}` : ""}`);
        }
        const better = !best || (result?.passed && !best.result?.passed) || (result && best.result && result.passed === best.result.passed && result.score > best.result.score);
        if (better || !result) best = { image, result };
        if (result?.passed || !critic) break;
      } catch (error) {
        console.log(`${n}번째 시도 ${attempt} 실패: ${error instanceof Error ? error.message : error}`);
      }
    }
    if (!best) continue;
    const extension = best.image.contentType.includes("jpeg") ? "jpg" : "png";
    const file = join(outDir, `${useType}-${n}.${extension}`);
    writeFileSync(file, best.image.bytes);
    if (best.result) writeFileSync(join(outDir, `${useType}-${n}-critique.json`), JSON.stringify(best.result, null, 2));
    console.log(`저장: ${file}${best.result ? (best.result.passed ? " (검수 통과)" : " (검수 미통과, 가장 나은 것)") : ""}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
