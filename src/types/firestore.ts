import { Timestamp } from "firebase/firestore";

export type AppConfig = {
  nextMemberIndex: number;
  memberOrder: string[];
};

export type Member = {
  id: string;
  name: string;
  active: boolean;
  createdAt?: Timestamp;
};

export type TaskTemplate = {
  id: string;
  title: string;
  active: boolean;
  createdAt?: Timestamp;
};

export type DailyPlan = {
  id: string;
  date: string;
  createdAt?: Timestamp;
};

export type DailyTask = {
  id: string;
  title: string;
  templateId?: string;
  assignedToMemberId: string | null;
  assignedToMemberName: string | null;
  assignedAt: Timestamp | null;
};

export type SpinLog = {
  id: string;
  selectedMemberId: string;
  selectedMemberName: string;
  selectedTaskId: string;
  selectedTaskTitle: string;
  oldIndex: number;
  newIndex: number;
  performedByName: string;
  createdAt?: Timestamp;
};

export type PlanHistoryLog = {
  id: string;
  date: string;
  action: "create" | "delete";
  performedByName: string;
  createdAt?: Timestamp;
};
