import { db } from "@/lib/firebase";
import { DailyTask, Member, PlanHistoryLog, SpinLog } from "@/types/firestore";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { appConfigRef, defaultAppConfig } from "@/services/app-config-service";

const DAILY_PLANS_COLLECTION = "dailyPlans";
const TASK_TEMPLATES_COLLECTION = "taskTemplates";
const PLAN_HISTORY_COLLECTION = "planHistory";

function dailyPlanDocRef(dateKey: string) {
  return doc(db, DAILY_PLANS_COLLECTION, dateKey);
}

function dailyTasksCollectionRef(dateKey: string) {
  return collection(db, DAILY_PLANS_COLLECTION, dateKey, "tasks");
}

function spinLogsCollectionRef(dateKey: string) {
  return collection(db, DAILY_PLANS_COLLECTION, dateKey, "spinLogs");
}

function planHistoryCollectionRef() {
  return collection(db, PLAN_HISTORY_COLLECTION);
}

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function createDailyPlanIfMissing(
  dateKey: string,
  performedByName: string,
): Promise<{ created: boolean }> {
  const normalizedDate = dateKey.trim();
  if (!normalizedDate) {
    return { created: false };
  }

  const planSnapshot = await getDoc(dailyPlanDocRef(normalizedDate));
  if (planSnapshot.exists()) {
    return { created: false };
  }

  const activeTemplatesQuery = query(
    collection(db, TASK_TEMPLATES_COLLECTION),
    where("active", "==", true),
    orderBy("createdAt", "asc"),
  );
  const activeTemplatesSnapshot = await getDocs(activeTemplatesQuery);

  const batch = writeBatch(db);
  batch.set(dailyPlanDocRef(normalizedDate), {
    date: normalizedDate,
    createdAt: serverTimestamp(),
  });

  batch.set(doc(planHistoryCollectionRef()), {
    action: "create",
    date: normalizedDate,
    performedByName: performedByName.trim() || "Không rõ",
    createdAt: serverTimestamp(),
  });

  activeTemplatesSnapshot.docs.forEach((item) => {
    const value = item.data() as { title?: string };
    const title = value.title?.trim();
    if (!title) {
      return;
    }

    const taskRef = doc(dailyTasksCollectionRef(normalizedDate), item.id);
    batch.set(taskRef, {
      title,
      templateId: item.id,
      assignedToMemberId: null,
      assignedToMemberName: null,
      assignedAt: null,
    });
  });

  await batch.commit();
  return { created: true };
}

export function subscribeDailyPlanExists(
  dateKey: string,
  onData: (exists: boolean) => void,
): () => void {
  if (!dateKey) {
    onData(false);
    return () => {};
  }

  return onSnapshot(dailyPlanDocRef(dateKey), (snapshot) => {
    onData(snapshot.exists());
  });
}

export async function deleteDailyPlan(
  dateKey: string,
  performedByName: string,
): Promise<{ deleted: boolean }> {
  const normalizedDate = dateKey.trim();
  if (!normalizedDate) {
    return { deleted: false };
  }

  const planRef = dailyPlanDocRef(normalizedDate);
  const planSnapshot = await getDoc(planRef);
  if (!planSnapshot.exists()) {
    return { deleted: false };
  }

  const [taskSnapshots, logSnapshots] = await Promise.all([
    getDocs(dailyTasksCollectionRef(normalizedDate)),
    getDocs(spinLogsCollectionRef(normalizedDate)),
  ]);

  const batch = writeBatch(db);
  taskSnapshots.docs.forEach((item) => batch.delete(item.ref));
  logSnapshots.docs.forEach((item) => batch.delete(item.ref));
  batch.set(doc(planHistoryCollectionRef()), {
    action: "delete",
    date: normalizedDate,
    performedByName: performedByName.trim() || "Không rõ",
    createdAt: serverTimestamp(),
  });
  batch.delete(planRef);

  await batch.commit();
  return { deleted: true };
}

export function subscribeDailyTasks(
  dateKey: string,
  onData: (tasks: DailyTask[]) => void,
): () => void {
  const q = query(dailyTasksCollectionRef(dateKey), orderBy("title", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const tasks = snapshot.docs.map((item) => {
        const value = item.data() as Omit<DailyTask, "id">;
        return {
          id: item.id,
          ...value,
        };
      });
      onData(tasks);
    },
    () => {
      onData([]);
    },
  );
}

export function subscribeSpinLogs(dateKey: string, onData: (logs: SpinLog[]) => void): () => void {
  const q = query(spinLogsCollectionRef(dateKey), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((item) => {
        const value = item.data() as Omit<SpinLog, "id">;
        return {
          id: item.id,
          ...value,
        };
      });
      onData(logs);
    },
    () => {
      onData([]);
    },
  );
}

export function subscribePlanHistory(
  dateKey: string,
  onData: (logs: PlanHistoryLog[]) => void,
): () => void {
  const q = query(planHistoryCollectionRef(), where("date", "==", dateKey));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs
        .map((item) => {
          const value = item.data() as Omit<PlanHistoryLog, "id">;
          return {
            id: item.id,
            ...value,
          };
        })
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      onData(logs);
    },
    () => {
      onData([]);
    },
  );
}

type AssignSpinInput = {
  dateKey: string;
  performedByName: string;
};

type AssignSpinSuccess = {
  ok: true;
  selectedMemberId: string;
  selectedMemberName: string;
  selectedTaskId: string;
  selectedTaskTitle: string;
  oldIndex: number;
  newIndex: number;
};

type AssignSpinFailure = {
  ok: false;
  reason:
    | "NO_ACTIVE_MEMBERS"
    | "NO_UNASSIGNED_TASKS"
    | "DAILY_PLAN_MISSING"
    | "INVALID_INPUT";
  message: string;
};

export type AssignSpinResult = AssignSpinSuccess | AssignSpinFailure;

export async function assignTaskBySpin(input: AssignSpinInput): Promise<AssignSpinResult> {
  const dateKey = input.dateKey.trim();
  const performedByName = input.performedByName.trim();

  if (!dateKey || !performedByName) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Ngày hoặc tên người quay không hợp lệ.",
    };
  }

  const planSnapshot = await getDoc(dailyPlanDocRef(dateKey));
  if (!planSnapshot.exists()) {
    return {
      ok: false,
      reason: "DAILY_PLAN_MISSING",
      message: "Kế hoạch ngày chưa tồn tại. Hãy tạo kế hoạch trước khi quay.",
    };
  }

  const configSnapshot = await getDoc(appConfigRef());
  const config = configSnapshot.exists()
    ? (configSnapshot.data() as { nextMemberIndex?: number; memberOrder?: string[] })
    : defaultAppConfig;

  const memberSnapshots = await getDocs(query(collection(db, "members"), where("active", "==", true)));
  const activeMembersById = new Map<string, Member>();
  memberSnapshots.docs.forEach((item) => {
    const value = item.data() as Omit<Member, "id">;
    activeMembersById.set(item.id, { id: item.id, ...value });
  });

  const orderedFromConfig = (config.memberOrder ?? [])
    .map((memberId) => activeMembersById.get(memberId))
    .filter((item): item is Member => Boolean(item));

  // Fallback for legacy data: if memberOrder is empty/outdated, still allow spin.
  const activeMembersNotInOrder = [...activeMembersById.values()].filter(
    (member) => !(config.memberOrder ?? []).includes(member.id),
  );
  const orderedActiveMembers = [...orderedFromConfig, ...activeMembersNotInOrder];

  const repairedMemberOrder = orderedActiveMembers.map((member) => member.id);

  if (orderedActiveMembers.length === 0) {
    return {
      ok: false,
      reason: "NO_ACTIVE_MEMBERS",
      message: "Không có thành viên hoạt động để phân công.",
    };
  }

  const unassignedTaskSnapshots = await getDocs(
    query(dailyTasksCollectionRef(dateKey), where("assignedToMemberId", "==", null)),
  );

  if (unassignedTaskSnapshots.empty) {
    return {
      ok: false,
      reason: "NO_UNASSIGNED_TASKS",
      message: "Tất cả công việc đã được phân công.",
    };
  }

  const totalMembers = orderedActiveMembers.length;
  const oldIndexRaw = config.nextMemberIndex ?? 0;
  const oldIndex = ((oldIndexRaw % totalMembers) + totalMembers) % totalMembers;
  const selectedMember = orderedActiveMembers[oldIndex];

  const unassignedTasks = unassignedTaskSnapshots.docs.map((item) => {
    const value = item.data() as Omit<DailyTask, "id">;
    return {
      id: item.id,
      ...value,
    };
  });

  const randomTaskIndex = Math.floor(Math.random() * unassignedTasks.length);
  const selectedTask = unassignedTasks[randomTaskIndex];
  const newIndex = (oldIndex + 1) % totalMembers;

  const batch = writeBatch(db);
  batch.set(
    doc(dailyTasksCollectionRef(dateKey), selectedTask.id),
    {
      assignedToMemberId: selectedMember.id,
      assignedToMemberName: selectedMember.name,
      assignedAt: serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
    appConfigRef(),
    {
      memberOrder: repairedMemberOrder,
      nextMemberIndex: newIndex,
    },
    { merge: true },
  );

  batch.set(doc(spinLogsCollectionRef(dateKey)), {
    selectedMemberId: selectedMember.id,
    selectedMemberName: selectedMember.name,
    selectedTaskId: selectedTask.id,
    selectedTaskTitle: selectedTask.title,
    oldIndex,
    newIndex,
    performedByName,
    createdAt: serverTimestamp(),
  });

  await batch.commit();

  return {
    ok: true,
    selectedMemberId: selectedMember.id,
    selectedMemberName: selectedMember.name,
    selectedTaskId: selectedTask.id,
    selectedTaskTitle: selectedTask.title,
    oldIndex,
    newIndex,
  };
}
