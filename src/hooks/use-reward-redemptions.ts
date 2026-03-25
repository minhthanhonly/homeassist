"use client";

import { useEffect, useState } from "react";
import { RewardRedemption } from "@/types/firestore";
import { subscribeRewardRedemptions } from "@/services/rewards-service";

export function useRewardRedemptions() {
  const [rows, setRows] = useState<RewardRedemption[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return subscribeRewardRedemptions((next) => {
      setRows(next);
      setReady(true);
    });
  }, []);

  return { rows, ready };
}
