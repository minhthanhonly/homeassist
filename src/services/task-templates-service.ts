import { db } from "@/lib/firebase";
import { TaskTemplate } from "@/types/firestore";
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

const TASK_TEMPLATES_COLLECTION = "taskTemplates";

function taskTemplatesCollectionRef() {
  return collection(db, TASK_TEMPLATES_COLLECTION);
}

function taskTemplateDocRef(taskTemplateId: string) {
  return doc(db, TASK_TEMPLATES_COLLECTION, taskTemplateId);
}

export function subscribeTaskTemplates(onData: (tasks: TaskTemplate[]) => void): () => void {
  const q = query(taskTemplatesCollectionRef(), orderBy("createdAt", "asc"));

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((item) => {
      const value = item.data() as Omit<TaskTemplate, "id">;
      return {
        id: item.id,
        ...value,
      };
    });

    onData(tasks);
  });
}

export async function createTaskTemplate(title: string): Promise<void> {
  const normalized = title.trim();
  if (!normalized) {
    return;
  }

  await addDoc(taskTemplatesCollectionRef(), {
    title: normalized,
    active: true,
    createdAt: serverTimestamp(),
  });
}

export async function updateTaskTemplateTitle(taskTemplateId: string, title: string): Promise<void> {
  const normalized = title.trim();
  if (!normalized) {
    return;
  }

  await runTransaction(db, async (transaction) => {
    transaction.set(taskTemplateDocRef(taskTemplateId), { title: normalized }, { merge: true });
  });
}

export async function toggleTaskTemplateActive(taskTemplateId: string, active: boolean): Promise<void> {
  await runTransaction(db, async (transaction) => {
    transaction.set(taskTemplateDocRef(taskTemplateId), { active }, { merge: true });
  });
}

export async function removeTaskTemplate(taskTemplateId: string): Promise<void> {
  await deleteDoc(taskTemplateDocRef(taskTemplateId));
}
