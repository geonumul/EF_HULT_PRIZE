// 시연용 렌더링을 미리 만든다. 공간 사진과 실측 치수, 업종을 주면 배치를 계산하고 Gemini로 이미지를 여러 장 뽑아 저장한다.
// 같은 조건으로 여러 장 뽑아서 가장 잘 나온 것을 골라 쓴다.
//
// 실행 (functions 폴더에서, 먼저 npm run build):
//   node lib/scripts/pregenerate.js --photo C:/사진/space.jpg --use cafe --width 6000 --depth 6600 --ceiling 3200 --count 3 --out C:/결과
//   --structure 구조그림.png  : tools/clay_render.py로 만든 점토 렌더링. 원근과 물건 위치를 정확히 따르게 한다.
//   --refs "체어=a.jpg,조명=b.jpg" : 상품 사진. 그 상품의 생김새로 그리게 한다.
//   --dry-run 을 붙이면 키 없이 배치와 프롬프트만 출력한다.
// 키는 functions/.env의 GEMINI_API_KEY 에서 읽는다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { GeminiImageGenerator, buildPrompt } from "../adapters/geminiImageGenerator";
import type { ImageGenerationRequest } from "../adapters/imageGenerator";
import { FakeDatabase } from "../adapters/supabaseClient";
import { buildLayout } from "../pipeline/layout";
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
  const room = { widthMm: requireNumber(args, "width"), depthMm: requireNumber(args, "depth"), ceilingMm: requireNumber(args, "ceiling") };
  const count = Number(args.count ?? 3);
  const dryRun = args["dry-run"] === "true";

  // 배치를 계산하고 치수 검증을 통과하는지 확인한다.
  const catalog = await new FakeDatabase().listProducts();
  const { units } = unitsFromTemplate(useType, room, catalog);
  const { layout, violations } = buildLayout(room, units, "text");
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
  for (let n = 1; n <= count; n++) {
    try {
      const image = await generator.generate(request);
      const extension = image.contentType.includes("jpeg") ? "jpg" : "png";
      const file = join(outDir, `${useType}-${n}.${extension}`);
      writeFileSync(file, image.bytes);
      console.log(`저장: ${file}`);
    } catch (error) {
      console.log(`${n}번째 실패: ${error instanceof Error ? error.message : error}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
