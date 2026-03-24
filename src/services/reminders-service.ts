import { db } from "@/lib/firebase";
import { ReminderItem } from "@/types/firestore";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

const REMINDERS_COLLECTION = "reminders";

function remindersCollectionRef() {
  return collection(db, REMINDERS_COLLECTION);
}

function reminderDocRef(reminderId: string) {
  return doc(db, REMINDERS_COLLECTION, reminderId);
}

export function subscribeReminders(onData: (reminders: ReminderItem[]) => void): () => void {
  const q = query(remindersCollectionRef(), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const reminders = snapshot.docs.map((item) => {
        const value = item.data() as Omit<ReminderItem, "id">;
        return {
          id: item.id,
          ...value,
        };
      });

      onData(reminders);
    },
    () => {
      onData([]);
    },
  );
}

export async function createReminder(title: string): Promise<void> {
  const normalized = title.trim();
  if (!normalized) {
    return;
  }

  await addDoc(remindersCollectionRef(), {
    title: normalized,
    done: false,
    doneAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateReminderTitle(reminderId: string, title: string): Promise<void> {
  const normalized = title.trim();
  if (!normalized) {
    return;
  }

  await runTransaction(db, async (transaction) => {
    transaction.set(
      reminderDocRef(reminderId),
      {
        title: normalized,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function toggleReminderDone(reminderId: string, done: boolean): Promise<void> {
  await runTransaction(db, async (transaction) => {
    transaction.set(
      reminderDocRef(reminderId),
      {
        done,
        doneAt: done ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function removeReminder(reminderId: string): Promise<void> {
  await deleteDoc(reminderDocRef(reminderId));
}
