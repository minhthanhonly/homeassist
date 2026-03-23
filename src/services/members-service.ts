import { db } from "@/lib/firebase";
import { Member } from "@/types/firestore";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { appConfigRef, defaultAppConfig } from "@/services/app-config-service";

const MEMBERS_COLLECTION = "members";

function membersCollectionRef() {
  return collection(db, MEMBERS_COLLECTION);
}

function memberDocRef(memberId: string) {
  return doc(db, MEMBERS_COLLECTION, memberId);
}

export function subscribeMembers(onData: (members: Member[]) => void): () => void {
  const q = query(membersCollectionRef(), orderBy("createdAt", "asc"));

  return onSnapshot(q, (snapshot) => {
    const members = snapshot.docs.map((item) => {
      const value = item.data() as Omit<Member, "id">;
      return {
        id: item.id,
        ...value,
      };
    });

    onData(members);
  });
}

export async function createMember(name: string): Promise<void> {
  const normalized = name.trim();
  if (!normalized) {
    return;
  }

  const newMemberRef = await addDoc(membersCollectionRef(), {
    name: normalized,
    active: true,
    createdAt: serverTimestamp(),
  });

  await runTransaction(db, async (transaction) => {
    const configSnapshot = await transaction.get(appConfigRef());
    const config = configSnapshot.exists()
      ? (configSnapshot.data() as { nextMemberIndex?: number; memberOrder?: string[] })
      : defaultAppConfig;

    const nextOrder = [...(config.memberOrder ?? []), newMemberRef.id];
    transaction.set(
      appConfigRef(),
      {
        memberOrder: nextOrder,
        nextMemberIndex: config.nextMemberIndex ?? 0,
      },
      { merge: true },
    );
  });
}

export async function updateMemberName(memberId: string, name: string): Promise<void> {
  const normalized = name.trim();
  if (!normalized) {
    return;
  }

  await runTransaction(db, async (transaction) => {
    transaction.set(memberDocRef(memberId), { name: normalized }, { merge: true });
  });
}

export async function toggleMemberActive(memberId: string, active: boolean): Promise<void> {
  await runTransaction(db, async (transaction) => {
    transaction.set(memberDocRef(memberId), { active }, { merge: true });
  });
}

export async function removeMember(memberId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const configSnapshot = await transaction.get(appConfigRef());
    const config = configSnapshot.exists()
      ? (configSnapshot.data() as { nextMemberIndex?: number; memberOrder?: string[] })
      : defaultAppConfig;

    const currentOrder = config.memberOrder ?? [];
    const removedIndex = currentOrder.indexOf(memberId);
    const nextOrder = currentOrder.filter((id) => id !== memberId);

    const currentIndex = config.nextMemberIndex ?? 0;
    let nextMemberIndex = currentIndex;

    if (nextOrder.length === 0) {
      nextMemberIndex = 0;
    } else if (removedIndex === -1) {
      nextMemberIndex = Math.min(currentIndex, nextOrder.length - 1);
    } else if (currentIndex > removedIndex) {
      nextMemberIndex = currentIndex - 1;
    } else if (currentIndex >= nextOrder.length) {
      nextMemberIndex = 0;
    }

    transaction.set(
      appConfigRef(),
      {
        memberOrder: nextOrder,
        nextMemberIndex,
      },
      { merge: true },
    );
    transaction.delete(memberDocRef(memberId));
  });
}
