// 스튜디오의 360 보기에서, 방 안 한 자리의 네 방향 모형 그림을 PNG로 저장한다(개발 서버가 떠 있어야 한다).
// 사용: NODE_PATH=<puppeteer-core가 있는 node_modules> node functions/tools/capture_pano_views.cjs <출력 폴더> <공간 id> <업종> [개발 서버 주소]
// puppeteer-core는 저장소 의존성에 없다. 서 있는 자리는 frontend/src/lib/panoViews.ts의 panoPosition과 같은 식이다.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const [outDir, spaceId, use, base = "http://localhost:3100"] = process.argv.slice(2);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--disable-web-security", "--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${base}/space/${spaceId}/studio?use=${use}`, { waitUntil: "networkidle2", timeout: 120000 });
  const click = (t) => page.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes(t)); if (b) b.click(); return !!b; }, t);
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((x) => x.textContent.includes("3D · 360")), { timeout: 90000 });
  await click("3D · 360");
  await new Promise((r) => setTimeout(r, 3000));
  await click("360 보기");
  await new Promise((r) => setTimeout(r, 3000));
  const shots = await page.evaluate(() => {
    const room = window.__viewer3d.room();
    const position = [Math.round(room.widthMm * 0.55), 1500, Math.round(room.depthMm * 0.72)];
    return { room, urls: window.__viewer3d.captureViews(position, [0, 90, 180, 270], 100, 1024, 768) };
  });
  fs.mkdirSync(outDir, { recursive: true });
  [0, 90, 180, 270].forEach((yaw, i) => fs.writeFileSync(`${outDir}/view-${yaw}.png`, Buffer.from(shots.urls[i].split(",")[1], "base64")));
  console.log("저장", outDir, JSON.stringify(shots.room));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
