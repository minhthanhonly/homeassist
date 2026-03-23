"use client";

import { useEffect, useState } from "react";
import { Member } from "@/types/firestore";
import { subscribeMembers } from "@/services/members-service";

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeMembers(setMembers);
    return unsubscribe;
  }, []);

  return members;
}
