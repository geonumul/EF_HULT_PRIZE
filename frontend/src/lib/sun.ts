// 해의 위치. 위도, 경도, 날짜와 시각으로 해의 방위와 고도를 구한다(SunCalc와 같은 천문 계산식).
// 3D 뷰어가 이 값으로 햇빛 방향과 하늘 색을 정한다. 시각은 한국 표준시(KST) 기준으로 받는다.

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const OBLIQUITY = RAD * 23.4397;

const toDays = (date: Date) => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
const rightAscension = (l: number) => Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY), Math.cos(l));
const declination = (l: number) => Math.asin(Math.sin(OBLIQUITY) * Math.sin(l));
const solarMeanAnomaly = (d: number) => RAD * (357.5291 + 0.98560028 * d);
const eclipticLongitude = (m: number) => {
  const c = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
  return m + c + RAD * 102.9372 + Math.PI;
};

/** 해의 위치. bearingDeg는 북쪽에서 시계 방향으로 잰 해의 방위(0~360), altitudeDeg는 지평선 위 고도다. */
export function sunPosition(date: Date, lat: number, lng: number): { bearingDeg: number; altitudeDeg: number } {
  const d = toDays(date);
  const l = eclipticLongitude(solarMeanAnomaly(d));
  const dec = declination(l);
  const ra = rightAscension(l);
  const phi = RAD * lat;
  const sidereal = RAD * (280.16 + 360.9856235 * d) - RAD * -lng;
  const h = sidereal - ra;
  const azimuthFromSouth = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h));
  return { bearingDeg: (((azimuthFromSouth / RAD + 180) % 360) + 360) % 360, altitudeDeg: altitude / RAD };
}

/** 한국 시각의 날짜와 시(소수 가능)로 Date를 만든다. */
export function kstDate(base: Date, hour: number): Date {
  const kst = new Date(base.getTime() + 9 * 3_600_000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 0, 0, 0) + (hour - 9) * 3_600_000);
}

/**
 * 해로 향하는 방향 벡터(3D 뷰어 좌표: x는 오른쪽, y는 위, z는 입구 쪽).
 * facingDeg는 입구에서 안쪽 벽을 볼 때 바라보는 방위(북쪽에서 시계 방향)다.
 */
export function sunVector(bearingDeg: number, altitudeDeg: number, facingDeg: number): { x: number; y: number; z: number } {
  const rel = (bearingDeg - facingDeg) * RAD;
  const alt = altitudeDeg * RAD;
  return { x: Math.sin(rel) * Math.cos(alt), y: Math.sin(alt), z: -Math.cos(rel) * Math.cos(alt) };
}

/** 고도에 따른 하늘 색(낮은 파랑, 해질녘 주황, 밤 남색) */
export function skyColor(altitudeDeg: number): string {
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.min(1, Math.max(0, t))));
  const night = [24, 30, 46];
  const dusk = [232, 170, 120];
  const day = [190, 218, 242];
  const rgb = altitudeDeg < 0 ? mix(night, dusk, (altitudeDeg + 8) / 8) : mix(dusk, day, altitudeDeg / 25);
  return `rgb(${rgb.join(",")})`;
}
