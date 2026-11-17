// 가짜 진행 막대. 서버 없이 렌더링이 만들어지는 것처럼 보이게 한다.
// 0에서 100까지 durationMs 동안 올린다. 반환한 함수를 부르면 멈춘다.
export function runFakeProgress(
  durationMs: number,
  onTick: (percent: number) => void,
  onDone: () => void,
): () => void {
  const stepMs = 100;
  let elapsed = 0;
  const timer = setInterval(() => {
    elapsed += stepMs;
    const percent = Math.min(100, Math.round((elapsed / durationMs) * 100));
    onTick(percent);
    if (percent >= 100) {
      clearInterval(timer);
      onDone();
    }
  }, stepMs);
  return () => clearInterval(timer);
}
