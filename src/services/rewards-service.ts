import { db } from "@/lib/firebase";
import {
  getEarnedPointsSinceAnchor,
  MYSTERY_WHEEL_PRIZES,
  REWARD_CATALOG,
} from "@/lib/rewards-constants";
import { RewardRedemption } from "@/types/firestore";
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getTodayDateKey } from "@/services/daily-plan-service";

const REDEMPTIONS_COLLECTION = "rewardRedemptions";

function redemptionsCollectionRef() {
  return collection(db, REDEMPTIONS_COLLECTION);
}

export function subscribeRewardRedemptions(onData: (rows: RewardRedemption[]) => void): () => void {
  const q = query(redemptionsCollectionRef(), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((docSnap) => {
        const value = docSnap.data() as Omit<RewardRedemption, "id">;
        return { id: docSnap.id, ...value };
      });
      onData(rows);
    },
    () => onData([]),
  );
}

export async function getTotalSpentForMember(memberId: string): Promise<number> {
  const q = query(redemptionsCollectionRef(), where("memberId", "==", memberId));
  const snap = await getDocs(q);
  let sum = 0;
  snap.docs.forEach((d) => {
    const v = d.data() as { cost?: number };
    sum += typeof v.cost === "number" ? v.cost : 0;
  });
  return sum;
}

export type RedeemResult =
  | {
      ok: true;
      redemptionId: string;
    }
  | { ok: false; message: string };

export async function redeemReward(input: {
  memberId: string;
  memberName: string;
  rewardId: string;
  performedByName: string;
}): Promise<RedeemResult> {
  const reward = REWARD_CATALOG.find((r) => r.id === input.rewardId);
  if (!reward) {
    return { ok: false, message: "Phần thưởng không hợp lệ." };
  }

  if (reward.id === "mystery") {
    return {
      ok: false,
      message: "Quà bí ẩn chỉ lưu sau khi quay xong (theo mũi tên).",
    };
  }

  const todayKey = getTodayDateKey();
  const earned = getEarnedPointsSinceAnchor(todayKey);
  const spent = await getTotalSpentForMember(input.memberId);
  const balance = earned - spent;

  if (balance < reward.cost) {
    return {
      ok: false,
      message: `Không đủ điểm (cần ${reward.cost}, hiện có ${balance}).`,
    };
  }

  const docRef = await addDoc(redemptionsCollectionRef(), {
    memberId: input.memberId,
    memberName: input.memberName.trim(),
    rewardId: reward.id,
    rewardTitle: reward.title,
    cost: reward.cost,
    performedByName: input.performedByName.trim() || "Không rõ",
    mysteryPrizeId: null,
    mysteryPrizeLabel: null,
    createdAt: serverTimestamp(),
  });

  return {
    ok: true,
    redemptionId: docRef.id,
  };
}

/** Lưu đổi quà bí ẩn sau khi vòng quay dừng — `mysteryPrizeId` phải khớp một lát hợp lệ. */
export async function redeemMysteryAfterSpin(input: {
  memberId: string;
  memberName: string;
  performedByName: string;
  mysteryPrizeId: string;
}): Promise<RedeemResult> {
  const prizeMeta = MYSTERY_WHEEL_PRIZES.find((p) => p.id === input.mysteryPrizeId.trim());
  if (!prizeMeta) {
    return { ok: false, message: "Giải quay không hợp lệ." };
  }

  const reward = REWARD_CATALOG.find((r) => r.id === "mystery");
  if (!reward) {
    return { ok: false, message: "Cấu hình quà bí ẩn thiếu." };
  }

  const todayKey = getTodayDateKey();
  const earned = getEarnedPointsSinceAnchor(todayKey);
  const spent = await getTotalSpentForMember(input.memberId);
  const balance = earned - spent;

  if (balance < reward.cost) {
    return {
      ok: false,
      message: `Không đủ điểm (cần ${reward.cost}, hiện có ${balance}).`,
    };
  }

  const docRef = await addDoc(redemptionsCollectionRef(), {
    memberId: input.memberId,
    memberName: input.memberName.trim(),
    rewardId: reward.id,
    rewardTitle: reward.title,
    cost: reward.cost,
    performedByName: input.performedByName.trim() || "Không rõ",
    mysteryPrizeId: prizeMeta.id,
    mysteryPrizeLabel: prizeMeta.label,
    createdAt: serverTimestamp(),
  });

  return { ok: true, redemptionId: docRef.id };
}
