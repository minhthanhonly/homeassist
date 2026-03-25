"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getEarnedPointsSinceAnchor,
  getMysteryWeights,
  MYSTERY_WHEEL_PRIZES,
  REWARD_ANCHOR_DATE,
  REWARD_CATALOG,
  segmentIndexUnderPointerWeighted,
  weightedSegmentCenterDeg,
} from "@/lib/rewards-constants";
import { Member } from "@/types/firestore";
import { redeemMysteryAfterSpin, redeemReward } from "@/services/rewards-service";
import { useRewardRedemptions } from "@/hooks/use-reward-redemptions";
import { getTodayDateKey } from "@/services/daily-plan-service";

const MYSTERY_SPIN_MS = 3000;
const MYSTERY_SPIN_TRANSITION = "transform 3s cubic-bezier(0.16, 1, 0.3, 1)";
/** Lưu phiên “đã bấm Đổi quà bí ẩn, chưa Quay” để hiện lại sau khi load trang. */
const MYSTERY_PENDING_STORAGE_KEY = "homeassist_mystery_spin_pending";

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

type RewardsSectionProps = {
  username: string | null;
  members: Member[];
};

export function RewardsSection({ username, members }: RewardsSectionProps) {
  const { rows: redemptions, ready: redemptionsReady } = useRewardRedemptions();
  const todayKey = getTodayDateKey();
  const earnedAll = getEarnedPointsSinceAnchor(todayKey);

  const spentByMember = useMemo(() => {
    const map = new Map<string, number>();
    redemptions.forEach((r) => {
      map.set(r.memberId, (map.get(r.memberId) ?? 0) + r.cost);
    });
    return map;
  }, [redemptions]);

  const activeMembers = members.filter((m) => m.active);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [pending, setPending] = useState(false);
  const [mysteryWheelDeg, setMysteryWheelDeg] = useState(0);
  const [mysterySpinning, setMysterySpinning] = useState(false);
  const [mysteryMember, setMysteryMember] = useState<{ id: string; name: string } | null>(null);
  const [mysteryOverlay, setMysteryOverlay] = useState<{
    prizeLabel: string | null;
    revealed: boolean;
    waitingForSpin: boolean;
  } | null>(null);
  /** Đồng bộ với localStorage (không đọc storage trong render — tránh lệch hydration). */
  const [mysteryPendingMemberIdFromStorage, setMysteryPendingMemberIdFromStorage] = useState<
    string | null
  >(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MYSTERY_PENDING_STORAGE_KEY);
      if (!raw) {
        setMysteryPendingMemberIdFromStorage(null);
        return;
      }
      const d = JSON.parse(raw) as { memberId?: string };
      setMysteryPendingMemberIdFromStorage(d.memberId ?? null);
    } catch {
      setMysteryPendingMemberIdFromStorage(null);
    }
  }, []);

  const clearMysteryPendingStorage = useCallback(() => {
    try {
      localStorage.removeItem(MYSTERY_PENDING_STORAGE_KEY);
    } catch {
      // ignore
    }
    setMysteryPendingMemberIdFromStorage(null);
  }, []);

  const writeMysteryPendingStorage = useCallback((memberId: string, memberName: string) => {
    try {
      localStorage.setItem(
        MYSTERY_PENDING_STORAGE_KEY,
        JSON.stringify({ memberId, memberName }),
      );
    } catch {
      // ignore quota / private mode
    }
    setMysteryPendingMemberIdFromStorage(memberId);
  }, []);

  const mysteryPendingRestoreDoneRef = useRef(false);

  useEffect(() => {
    if (mysteryPendingRestoreDoneRef.current) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    const raw = localStorage.getItem(MYSTERY_PENDING_STORAGE_KEY);
    if (!raw) {
      mysteryPendingRestoreDoneRef.current = true;
      return;
    }

    if (!redemptionsReady) {
      return;
    }

    let data: { memberId: string; memberName: string };
    try {
      data = JSON.parse(raw) as { memberId: string; memberName: string };
    } catch {
      clearMysteryPendingStorage();
      mysteryPendingRestoreDoneRef.current = true;
      return;
    }

    if (!data.memberId) {
      clearMysteryPendingStorage();
      mysteryPendingRestoreDoneRef.current = true;
      return;
    }

    if (members.length === 0) {
      return;
    }

    const still = members.find((m) => m.id === data.memberId && m.active);
    if (!still) {
      clearMysteryPendingStorage();
      mysteryPendingRestoreDoneRef.current = true;
      return;
    }

    const mysteryItem = REWARD_CATALOG.find((r) => r.id === "mystery");
    if (!mysteryItem) {
      mysteryPendingRestoreDoneRef.current = true;
      return;
    }

    const spent = spentByMember.get(data.memberId) ?? 0;
    const bal = earnedAll - spent;
    if (bal < mysteryItem.cost) {
      clearMysteryPendingStorage();
      mysteryPendingRestoreDoneRef.current = true;
      return;
    }

    mysteryPendingRestoreDoneRef.current = true;
    setMysteryMember({ id: data.memberId, name: data.memberName });
    setMysteryOverlay({
      prizeLabel: null,
      revealed: false,
      waitingForSpin: true,
    });
    setMysterySpinning(false);
    setSelectedMemberId(data.memberId);
  }, [members, spentByMember, earnedAll, redemptionsReady, clearMysteryPendingStorage]);

  /** Sau khi Đóng: mở lại vòng quay khi chọn đúng thành viên còn phiên pending trong storage. */
  useEffect(() => {
    if (!redemptionsReady) {
      return;
    }
    if (!mysteryPendingMemberIdFromStorage) {
      return;
    }
    if (selectedMemberId !== mysteryPendingMemberIdFromStorage) {
      return;
    }
    if (mysteryOverlay) {
      return;
    }
    const still = members.find((m) => m.id === mysteryPendingMemberIdFromStorage && m.active);
    if (!still) {
      return;
    }
    const mysteryItem = REWARD_CATALOG.find((r) => r.id === "mystery");
    if (!mysteryItem) {
      return;
    }
    const spent = spentByMember.get(still.id) ?? 0;
    const bal = earnedAll - spent;
    if (bal < mysteryItem.cost) {
      clearMysteryPendingStorage();
      return;
    }
    setMysteryMember({ id: still.id, name: still.name });
    setMysteryOverlay({
      prizeLabel: null,
      revealed: false,
      waitingForSpin: true,
    });
    setMysterySpinning(false);
  }, [
    mysteryPendingMemberIdFromStorage,
    selectedMemberId,
    mysteryOverlay,
    members,
    spentByMember,
    earnedAll,
    clearMysteryPendingStorage,
    redemptionsReady,
  ]);

  const mysteryCost = REWARD_CATALOG.find((r) => r.id === "mystery")?.cost ?? 0;

  /**
   * Đã bấm Đổi quà bí ẩn nhưng chưa ghi nhận đổi trên server — trừ tạm vào điểm khả dụng.
   * Dùng state đồng bộ storage + UI (kể cả khi đã Đóng panel nhưng phiên vẫn pending).
   */
  const mysteryReserveForMember = (memberId: string): number => {
    if (mysteryCost <= 0) {
      return 0;
    }
    if (mysteryOverlay?.revealed && !mysterySpinning) {
      return 0;
    }
    if (mysteryPendingMemberIdFromStorage === memberId) {
      return mysteryCost;
    }
    if (mysteryMember?.id === memberId && mysteryOverlay) {
      return mysteryCost;
    }
    return 0;
  };

  const availablePointsForMember = (memberId: string) => {
    const spent = spentByMember.get(memberId) ?? 0;
    return earnedAll - spent - mysteryReserveForMember(memberId);
  };

  const formatRedeemDate = (seconds?: number) => {
    if (!seconds) {
      return "—";
    }
    return new Date(seconds * 1000).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRedeem = async (rewardId: string) => {
    if (!username || !selectedMemberId) {
      return;
    }
    const member = activeMembers.find((m) => m.id === selectedMemberId);
    if (!member) {
      return;
    }

    if (rewardId === "mystery") {
      const item = REWARD_CATALOG.find((r) => r.id === "mystery");
      if (!item) {
        return;
      }
      const bal = availablePointsForMember(member.id);
      if (bal < item.cost) {
        window.alert(`Không đủ điểm (cần ${item.cost}, hiện có ${bal}).`);
        return;
      }
      setMysteryMember({ id: member.id, name: member.name });
      setMysterySpinning(false);
      setMysteryOverlay({
        prizeLabel: null,
        revealed: false,
        waitingForSpin: true,
      });
      writeMysteryPendingStorage(member.id, member.name);
      return;
    }

    setPending(true);
    const result = await redeemReward({
      memberId: member.id,
      memberName: member.name,
      rewardId,
      performedByName: username,
    });
    setPending(false);

    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    window.alert(`Đã đổi: ${REWARD_CATALOG.find((r) => r.id === rewardId)?.title ?? rewardId}`);
  };

  const runMysterySpin = async () => {
    if (!mysteryOverlay?.waitingForSpin || mysterySpinning || !mysteryMember || !username) {
      return;
    }

    setMysteryOverlay((prev) =>
      prev ? { ...prev, waitingForSpin: false, revealed: false } : null,
    );
    setMysterySpinning(true);

    const start = mysteryWheelDeg;
    const extra = 2160 + Math.floor(Math.random() * 360);
    const endRot = start + extra;
    requestAnimationFrame(() => {
      setMysteryWheelDeg(endRot);
    });

    await sleep(MYSTERY_SPIN_MS);

    const weights = getMysteryWeights();
    const winIdx = segmentIndexUnderPointerWeighted(endRot, weights);
    const prize = MYSTERY_WHEEL_PRIZES[winIdx];

    setPending(true);
    const result = await redeemMysteryAfterSpin({
      memberId: mysteryMember.id,
      memberName: mysteryMember.name,
      performedByName: username,
      mysteryPrizeId: prize.id,
    });
    setPending(false);
    setMysterySpinning(false);

    if (!result.ok) {
      window.alert(result.message);
      setMysteryOverlay((prev) =>
        prev ? { prizeLabel: null, revealed: false, waitingForSpin: true } : null,
      );
      return;
    }

    setMysteryOverlay({
      prizeLabel: prize.label,
      revealed: true,
      waitingForSpin: false,
    });
    clearMysteryPendingStorage();

    window.alert(`Kết quả quà bí ẩn: ${prize.label}`);
  };

  const mysteryPalette = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"];
  const mysteryWeights = getMysteryWeights();
  const mysteryTotalW = mysteryWeights.reduce((a, b) => a + b, 0);
  const mysteryConic = (() => {
    let acc = 0;
    const parts: string[] = [];
    mysteryWeights.forEach((w, i) => {
      const start = (acc / mysteryTotalW) * 360;
      acc += w;
      const end = (acc / mysteryTotalW) * 360;
      parts.push(`${mysteryPalette[i % mysteryPalette.length]} ${start}deg ${end}deg`);
    });
    return parts.join(", ");
  })();

  const labelRadius = 74;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-indigo-100">
      <h2 className="text-base font-semibold text-zinc-900">Phần thưởng</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Tích điểm từ ngày {REWARD_ANCHOR_DATE.split("-").reverse().join("/")}: mỗi thành viên{" "}
        <span className="font-semibold text-zinc-800">+1 điểm mỗi ngày</span>. Hôm nay mỗi người đã có{" "}
        <span className="font-semibold text-indigo-700">{earnedAll}</span> điểm tích lũy (trước khi đổi).
      </p>

      <div className="mt-4">
        <label className="text-xs font-medium text-zinc-600">Thành viên đổi thưởng</label>
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">— Chọn thành viên —</option>
          {activeMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 rounded-xl bg-zinc-50 p-3">
        <p className="text-sm font-semibold text-zinc-900">Điểm khả dụng (từ mốc tích lũy)</p>
        <ul className="mt-2 space-y-1">
          {activeMembers.map((m) => {
            const bal = availablePointsForMember(m.id);
            return (
              <li key={m.id} className="flex justify-between text-sm text-zinc-700">
                <span>{m.name}</span>
                <span className="font-semibold text-zinc-900">{bal} điểm</span>
              </li>
            );
          })}
          {activeMembers.length === 0 ? (
            <li className="text-sm text-zinc-500">Chưa có thành viên hoạt động.</li>
          ) : null}
        </ul>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-zinc-900">Đổi phần thưởng</p>
        {REWARD_CATALOG.map((item) => {
          const member = activeMembers.find((m) => m.id === selectedMemberId);
          const bal = member ? availablePointsForMember(member.id) : 0;
          const can = Boolean(member && bal >= item.cost && !pending);
          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                <p className="text-xs text-zinc-500">{item.cost} điểm</p>
              </div>
              <button
                type="button"
                disabled={!can}
                onClick={() => void handleRedeem(item.id)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Đổi
              </button>
            </div>
          );
        })}
      </div>

      {mysteryOverlay && mysteryMember && selectedMemberId === mysteryMember.id ? (
        <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50/80 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-center text-sm font-semibold text-indigo-900">Quà bí ẩn — vòng quay</p>
            <button
              type="button"
              onClick={() => {
                setMysteryOverlay(null);
                setMysterySpinning(false);
                setMysteryMember(null);
                setSelectedMemberId("");
              }}
              className="shrink-0 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
            >
              Đóng
            </button>
          </div>
          {mysteryOverlay.waitingForSpin && !mysterySpinning ? (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => void runMysterySpin()}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Quay
              </button>
            </div>
          ) : mysterySpinning ? (
            <p className="mt-3 text-center text-xs text-indigo-600">Đang quay…</p>
          ) : mysteryOverlay.revealed ? (
            <p className="mt-3 text-center text-xs text-indigo-700">
              Giải nhận được: <span className="font-semibold">{mysteryOverlay.prizeLabel}</span>
            </p>
          ) : null}
          <div className="relative mx-auto mt-3 flex h-56 w-56 items-center justify-center">
            <div className="absolute top-0 z-10 -translate-y-1 text-2xl">▼</div>
            <div
              className="relative h-52 w-52 rounded-full border-4 border-white shadow-xl"
              style={{
                transform: `rotate(${mysteryWheelDeg}deg)`,
                transformOrigin: "center center",
                transition: MYSTERY_SPIN_TRANSITION,
                background: `conic-gradient(${mysteryConic})`,
              }}
            >
              {MYSTERY_WHEEL_PRIZES.map((prize, idx) => {
                const centerDeg = weightedSegmentCenterDeg(mysteryWeights, idx);
                const angle = centerDeg - 90;
                const x = Math.cos((angle * Math.PI) / 180) * labelRadius;
                const y = Math.sin((angle * Math.PI) / 180) * labelRadius;
                const posDeg = (Math.atan2(y, x) * 180) / Math.PI;
                const labelRotate = posDeg + 180;
                return (
                  <span
                    key={prize.id}
                    title={prize.label}
                    className="pointer-events-none absolute inline-block max-w-[72px] truncate rounded bg-white/85 px-0.5 py-0.5 text-center text-[9px] font-semibold text-zinc-800 shadow-sm"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      maxWidth: `${labelRadius}px`,
                      transform: `translate(-50%, -50%) rotate(${labelRotate}deg)`,
                    }}
                  >
                    {prize.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl bg-zinc-50 p-3">
        <p className="text-sm font-semibold text-zinc-900">Lịch sử đổi thưởng</p>
        {redemptions.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Chưa có giao dịch.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {redemptions.map((r) => (
              <li key={r.id} className="rounded-lg bg-white p-2 text-sm ring-1 ring-zinc-200">
                <p className="font-medium text-zinc-900">
                  {r.memberName} — {r.rewardTitle} (−{r.cost} điểm)
                </p>
                {r.mysteryPrizeLabel ? (
                  <p className="text-xs text-indigo-700">Mở quà: {r.mysteryPrizeLabel}</p>
                ) : null}
                <p className="text-xs text-zinc-500">
                  {formatRedeemDate(r.createdAt?.seconds)} · bởi {r.performedByName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
