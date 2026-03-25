/** Ngày bắt đầu tích điểm: mỗi thành viên +1 điểm mỗi ngày (tính cả ngày này). */
export const REWARD_ANCHOR_DATE = "2026-03-25";

export type RewardCatalogItem = {
  id: string;
  title: string;
  cost: number;
};

export const REWARD_CATALOG: RewardCatalogItem[] = [
  { id: "milk-tea", title: "Trà sữa", cost: 7 },
  { id: "ice-cream", title: "Ăn kem", cost: 10 },
  { id: "cinema", title: "Đi xem phim", cost: 20 },
  { id: "buffet", title: "Đi ăn buffet", cost: 50 },
  { id: "travel-domestic-catalog", title: "Du lịch trong nước", cost: 180 },
  { id: "mystery", title: "Quà bí ẩn", cost: 360 },
];

/** Vòng quay quà bí ẩn (tổng trọng số = 100). */
export const MYSTERY_WHEEL_PRIZES: { id: string; label: string; weight: number }[] = [
  { id: "phone", label: "Điện thoại mới", weight: 20 },
  { id: "travel-domestic", label: "Chúc may mắn!", weight: 50 },
  { id: "travel-abroad", label: "Du lịch nước ngoài", weight: 10 },
  { id: "laptop", label: "Laptop mới", weight: 20 },
];

export function getEarnedPointsSinceAnchor(todayDateKey: string): number {
  if (todayDateKey < REWARD_ANCHOR_DATE) {
    return 0;
  }
  const anchor = new Date(`${REWARD_ANCHOR_DATE}T12:00:00`);
  const today = new Date(`${todayDateKey}T12:00:00`);
  const diffDays = Math.floor((today.getTime() - anchor.getTime()) / 86400000);
  return diffDays + 1;
}

export function getMysteryWeights(): number[] {
  return MYSTERY_WHEEL_PRIZES.map((p) => p.weight);
}

function normalizeDeg(deg: number) {
  return ((deg % 360) + 360) % 360;
}

/** Tâm lát i (độ, từ 12h kim đồng hồ) với lát có độ rộng theo weight. */
export function weightedSegmentCenterDeg(weights: number[], index: number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return 0; 
  }
  let acc = 0;
  for (let j = 0; j < index; j++) {
    acc += (weights[j] / total) * 360;
  }
  const span = (weights[index] / total) * 360;
  return acc + span / 2;
}

/** Chỉ số lát (0..n-1) nằm dưới mũi tên 12h khi bánh xoay `rotationDeg`, lát có độ rộng theo `weights`. */
export function segmentIndexUnderPointerWeighted(rotationDeg: number, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || weights.length === 0) {
    return 0;
  }
  const alpha = normalizeDeg(-rotationDeg);
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    const span = (weights[i] / total) * 360;
    const end = acc + span;
    const atLast = i === weights.length - 1;
    if (alpha >= acc && (atLast ? alpha <= end + 1e-6 : alpha < end - 1e-9)) {
      return i;
    }
    acc = end;
  }
  return weights.length - 1;
}
