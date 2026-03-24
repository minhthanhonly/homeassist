"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredUsername } from "@/lib/storage";
import { useMembers } from "@/hooks/use-members";
import { useTaskTemplates } from "@/hooks/use-task-templates";
import { useAppConfig } from "@/hooks/use-app-config";
import { useStoredUsername } from "@/hooks/use-stored-username";
import { useDailyTasks } from "@/hooks/use-daily-tasks";
import { useDailyPlanExists } from "@/hooks/use-daily-plan-exists";
import { usePlanHistory } from "@/hooks/use-plan-history";
import {
  createMember,
  removeMember,
  toggleMemberActive,
  updateMemberName,
} from "@/services/members-service";
import {
  createTaskTemplate,
  removeTaskTemplate,
  toggleTaskTemplateActive,
  updateTaskTemplateTitle,
} from "@/services/task-templates-service";
import {
  assignTaskBySpin,
  createDailyPlanIfMissing,
  deleteDailyPlan,
  getTodayDateKey,
} from "@/services/daily-plan-service";

export default function DashboardPage() {
  const router = useRouter();
  const username = useStoredUsername();
  const members = useMembers();
  const taskTemplates = useTaskTemplates();
  const appConfig = useAppConfig();
  const [selectedDate, setSelectedDate] = useState(getTodayDateKey);
  const hasDailyPlan = useDailyPlanExists(selectedDate);
  const dailyTasks = useDailyTasks(selectedDate);
  const planHistoryLogs = usePlanHistory(selectedDate);
  const [activeTab, setActiveTab] = useState<"members" | "tasks">("members");
  const [activeSection, setActiveSection] = useState<"plan" | "setup">("plan");
  const [newMemberName, setNewMemberName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [dailyPlanMessage, setDailyPlanMessage] = useState("");
  const [dailyPlanMessageTone, setDailyPlanMessageTone] = useState<"success" | "warning">("success");
  const [spinMessage, setSpinMessage] = useState("");
  const [spinMessageTone, setSpinMessageTone] = useState<"success" | "error" | "info">("info");
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(
    null,
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotationDeg, setWheelRotationDeg] = useState(0);

  const activeMembersById = new Map(members.filter((member) => member.active).map((member) => [member.id, member]));
  const orderedMembers = (appConfig.memberOrder ?? [])
    .map((memberId) => activeMembersById.get(memberId))
    .filter((member): member is (typeof members)[number] => Boolean(member));
  const membersNotInOrder = members.filter(
    (member) => member.active && !orderedMembers.some((ordered) => ordered.id === member.id),
  );
  const spinMemberPool = [...orderedMembers, ...membersNotInOrder];
  const spinMemberName =
    spinMemberPool.length > 0
      ? spinMemberPool[
          ((appConfig.nextMemberIndex ?? 0) % spinMemberPool.length + spinMemberPool.length) %
            spinMemberPool.length
        ]?.name
      : null;

  const wheelTasks = dailyTasks.filter((task) => !task.assignedToMemberId);
  const wheelSegmentCount = Math.max(wheelTasks.length, 1);
  const assignedTasksByMember = dailyTasks
    .filter((task) => task.assignedToMemberId)
    .reduce<Record<string, typeof dailyTasks>>((acc, task) => {
      const key = task.assignedToMemberName ?? "Chưa rõ";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(task);
      return acc;
    }, {});

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleDateChange = (nextDate: string) => {
    setSelectedDate(nextDate);
    setDailyPlanMessage("");
    setSpinMessage("");
    setToast(null);
  };

  const handleCreateMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!newMemberName.trim()) {
      return;
    }
    setPending(true);
    await createMember(newMemberName);
    setNewMemberName("");
    setToast({ text: "Đã thêm thành viên.", tone: "success" });
    setPending(false);
  };

  const handleCreateTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!newTaskTitle.trim()) {
      return;
    }
    setPending(true);
    await createTaskTemplate(newTaskTitle);
    setNewTaskTitle("");
    setToast({ text: "Đã thêm công việc.", tone: "success" });
    setPending(false);
  };

  const handleCreateDailyPlan = async () => {
    if (!selectedDate || !username) {
      return;
    }

    setPending(true);
    const result = await createDailyPlanIfMissing(selectedDate, username);
    if (result.created) {
      setDailyPlanMessage("Đã tạo kế hoạch cho ngày đã chọn.");
      setDailyPlanMessageTone("success");
      setToast({ text: "Tạo kế hoạch thành công.", tone: "success" });
    } else {
      setDailyPlanMessage("Kế hoạch đã tồn tại, không tạo trùng.");
      setDailyPlanMessageTone("warning");
      setToast({ text: "Kế hoạch đã tồn tại.", tone: "info" });
    }
    setPending(false);
  };

  const handleSpinAssign = async () => {
    if (!selectedDate || !username || isSpinning) {
      return;
    }

    const extraRotation = 1440 + Math.floor(Math.random() * 360);
    setIsSpinning(true);
    setWheelRotationDeg((prev) => prev + extraRotation);
    setSpinMessage("Đang quay vòng tròn phân công...");
    setSpinMessageTone("info");
    setPending(true);

    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), 2200);
    });

    const result = await assignTaskBySpin({
      dateKey: selectedDate,
      performedByName: username,
    });

    if (result.ok) {
      setSpinMessage(`Đã phân công "${result.selectedTaskTitle}" cho ${result.selectedMemberName}.`);
      setSpinMessageTone("success");
      setToast({ text: "Phân công thành công.", tone: "success" });
    } else {
      setSpinMessage(result.message);
      setSpinMessageTone("error");
      setToast({ text: result.message, tone: "error" });
    }
    setPending(false);
    setIsSpinning(false);
  };

  const handleBulkAssign = async () => {
    if (!selectedDate || !username || isSpinning || wheelTasks.length === 0) {
      return;
    }

    setPending(true);
    setSpinMessageTone("info");
    setSpinMessage("Đang phân công hàng loạt...");

    let assignedCount = 0;
    let guard = 0;

    while (guard < 200) {
      guard += 1;
      const result = await assignTaskBySpin({
        dateKey: selectedDate,
        performedByName: username,
      });

      if (!result.ok) {
        if (result.reason === "NO_UNASSIGNED_TASKS") {
          break;
        }
        setSpinMessage(result.message);
        setSpinMessageTone("error");
        setToast({ text: result.message, tone: "error" });
        setPending(false);
        return;
      }

      assignedCount += 1;
    }

    setSpinMessage(`Đã phân công liên tiếp ${assignedCount} công việc.`);
    setSpinMessageTone("success");
    setToast({ text: `Đã phân công ${assignedCount} công việc.`, tone: "success" });
    setPending(false);
  };

  const handleDeleteDailyPlan = async () => {
    if (!selectedDate || !username) {
      return;
    }

    const confirmed = window.confirm("Bạn có chắc muốn xóa kế hoạch của ngày này không?");
    if (!confirmed) {
      return;
    }

    setPending(true);
    const result = await deleteDailyPlan(selectedDate, username);
    setDailyPlanMessage(
      result.deleted ? "Đã xóa kế hoạch của ngày đã chọn." : "Không tìm thấy kế hoạch để xóa.",
    );
    setDailyPlanMessageTone(result.deleted ? "success" : "warning");
    setSpinMessage("");
    setToast({
      text: result.deleted ? "Đã xóa kế hoạch." : "Không tìm thấy kế hoạch.",
      tone: result.deleted ? "success" : "error",
    });
    setPending(false);
  };

  const shiftDate = (days: number) => {
    if (!selectedDate) {
      return;
    }
    const dt = new Date(`${selectedDate}T00:00:00`);
    dt.setDate(dt.getDate() + days);
    const nextYear = dt.getFullYear();
    const nextMonth = String(dt.getMonth() + 1).padStart(2, "0");
    const nextDay = String(dt.getDate()).padStart(2, "0");
    handleDateChange(`${nextYear}-${nextMonth}-${nextDay}`);
  };

  const dailyPlanMessageClass =
    dailyPlanMessageTone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  const spinMessageClass =
    spinMessageTone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : spinMessageTone === "error"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-indigo-50 text-indigo-700 border-indigo-200";

  const toastClass =
    toast?.tone === "success"
      ? "bg-emerald-600"
      : toast?.tone === "error"
        ? "bg-rose-600"
        : "bg-zinc-900";

  const formatHistoryDateTime = (seconds?: number) => {
    if (!seconds) {
      return "";
    }
    return new Date(seconds * 1000).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-gradient-to-b from-indigo-50 to-zinc-50 px-4 py-6">
      {pending ? (
        <div className="sticky top-3 z-20 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          Đang xử lý...
        </div>
      ) : null}

      {toast ? (
        <div
          className={`fixed left-1/2 top-4 z-30 w-[90%] max-w-sm -translate-x-1/2 rounded-xl px-4 py-2 text-center text-sm text-white shadow-lg ${toastClass}`}
        >
          {toast.text}
        </div>
      ) : null}

      <section className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-indigo-100">
        <h1 className="text-xl font-semibold text-zinc-900">Home Assist</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Xin chào, <span className="font-medium text-zinc-900">{username ?? "bạn"}</span>.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-3 shadow-md ring-1 ring-indigo-100">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveSection("plan")}
            className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${
              activeSection === "plan" ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            <span className="block text-lg">🎡</span>
            Phân công
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("setup")}
            className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${
              activeSection === "setup" ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            <span className="block text-lg">⚙️</span>
            Quản lý
          </button>
        </div>
      </section>

      {activeSection === "setup" ? (
      <section className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-indigo-100">
        <h2 className="text-base font-semibold text-zinc-900">Quản lý thông tin</h2>
        <p className="mt-1 text-sm text-zinc-600">Quản lý thành viên và danh sách công việc.</p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === "members" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            Thành viên
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === "tasks" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            Công việc
          </button>
        </div>

        {activeTab === "members" ? (
          <div className="mt-4 space-y-3">
            <form onSubmit={handleCreateMember} className="flex gap-2">
              <input
                value={newMemberName}
                onChange={(event) => setNewMemberName(event.target.value)}
                placeholder="Thêm thành viên"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Thêm
              </button>
            </form>

            <div className="space-y-2">
              {members.map((member) => (
                <article key={member.id} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-zinc-900">{member.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        member.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {member.active ? "active" : "inactive"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = window.prompt("Sửa tên thành viên", member.name)?.trim();
                        if (!updated) {
                          return;
                        }
                        await updateMemberName(member.id, updated);
                        setToast({ text: "Đã cập nhật tên thành viên.", tone: "success" });
                      }}
                      className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleMemberActive(member.id, !member.active);
                        setToast({ text: "Đã đổi trạng thái thành viên.", tone: "success" });
                      }}
                      className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700"
                    >
                      Bật/Tắt
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = window.confirm("Xóa thành viên này?");
                        if (!confirmed) {
                          return;
                        }
                        await removeMember(member.id);
                        setToast({ text: "Đã xóa thành viên.", tone: "success" });
                      }}
                      className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-700"
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
              {members.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 p-3 text-sm text-zinc-500">
                  Chưa có thành viên.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <form onSubmit={handleCreateTask} className="flex gap-2">
              <input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Thêm công việc"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Thêm
              </button>
            </form>

            <div className="space-y-2">
              {taskTemplates.map((task) => (
                <article key={task.id} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-zinc-900">{task.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        task.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {task.active ? "active" : "inactive"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = window.prompt("Sửa tên công việc", task.title)?.trim();
                        if (!updated) {
                          return;
                        }
                        await updateTaskTemplateTitle(task.id, updated);
                        setToast({ text: "Đã cập nhật công việc.", tone: "success" });
                      }}
                      className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleTaskTemplateActive(task.id, !task.active);
                        setToast({ text: "Đã đổi trạng thái công việc.", tone: "success" });
                      }}
                      className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700"
                    >
                      Bật/Tắt
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = window.confirm("Xóa công việc này?");
                        if (!confirmed) {
                          return;
                        }
                        await removeTaskTemplate(task.id);
                        setToast({ text: "Đã xóa công việc.", tone: "success" });
                      }}
                      className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-700"
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
              {taskTemplates.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 p-3 text-sm text-zinc-500">
                  Chưa có công việc.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>
      ) : null}

      {activeSection === "plan" ? (
      <section className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-indigo-100">
        <h2 className="text-base font-semibold text-zinc-900">Phân công theo ngày</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Chọn ngày, tạo danh sách việc và quay để giao việc.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-base text-zinc-700 hover:bg-zinc-100"
            aria-label="Ngày trước"
            title="Ngày trước"
          >
            ◀️
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              handleDateChange(event.target.value);
            }}
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="button"
            onClick={() => handleDateChange(getTodayDateKey())}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-base text-zinc-700 hover:bg-zinc-100"
            aria-label="Hôm nay"
            title="Hôm nay"
          >
            📍
          </button>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-base text-zinc-700 hover:bg-zinc-100"
            aria-label="Ngày tiếp theo"
            title="Ngày tiếp theo"
          >
            ▶️
          </button>
          {!hasDailyPlan ? (
            <button
              type="button"
              onClick={handleCreateDailyPlan}
              disabled={pending || !selectedDate}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Tạo
            </button>
          ) : null}
          {hasDailyPlan ? (
            <button
              type="button"
              onClick={handleDeleteDailyPlan}
              disabled={pending || !selectedDate}
              className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"
            >
              Xóa
            </button>
          ) : null}
        </div>

        {dailyPlanMessage ? (
          <p className={`mt-2 rounded-lg border px-3 py-2 text-xs ${dailyPlanMessageClass}`}>
            {dailyPlanMessage}
          </p>
        ) : null}

        {wheelTasks.length > 0 ? (
          <div className="mt-4 flex flex-col items-center">
            <p className="mb-2 text-sm font-medium text-zinc-700">
              Thành viên được chọn:{" "}
              <span className="font-semibold text-zinc-900">
                {spinMemberName ?? "Chưa có thành viên hoạt động"}
              </span>
            </p>
            <div className="relative flex h-56 w-56 items-center justify-center">
              <div className="absolute top-0 z-10 -translate-y-1 text-2xl">▼</div>
              <div
                className="relative h-52 w-52 rounded-full border-4 border-white shadow-xl"
                style={{
                  transform: `rotate(${wheelRotationDeg}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 2.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  background: `conic-gradient(
                    ${Array.from({ length: wheelSegmentCount })
                      .map((_, idx) => {
                        const start = (360 / wheelSegmentCount) * idx;
                        const end = (360 / wheelSegmentCount) * (idx + 1);
                        const palette = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];
                        return `${palette[idx % palette.length]} ${start}deg ${end}deg`;
                      })
                      .join(", ")}
                  )`,
                }}
              >
                {wheelTasks.map((task, idx) => {
                  const angle = (360 / wheelSegmentCount) * idx + 360 / wheelSegmentCount / 2 - 90;
                  const radius = 74;
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;
                  const posDeg = (Math.atan2(y, x) * 180) / Math.PI;
                  // Chữ nằm dọc bán kính, hướng về tâm (trục ngang của dòng chữ trùng hướng vào trong)
                  const labelRotate = posDeg + 180;
                  return (
                    <span
                      key={task.id}
                      title={task.title}
                      className="pointer-events-none absolute inline-block truncate whitespace-nowrap rounded bg-white/80 px-1 py-0.5 text-left text-[10px] font-semibold text-zinc-800 shadow-sm"
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        maxWidth: `${radius}px`,
                        transform: `translate(-50%, -50%) rotate(${labelRotate}deg)`,
                      }}
                    >
                      {task.title}
                    </span>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSpinAssign}
              disabled={pending || !selectedDate || !username || isSpinning || !hasDailyPlan}
              className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSpinning ? "Đang quay..." : "Quay phân công"}
            </button>
            <button
              type="button"
              onClick={handleBulkAssign}
              disabled={pending || !selectedDate || !username || !hasDailyPlan || wheelTasks.length === 0}
              className="mt-2 w-full rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 disabled:opacity-50"
            >
              Phân công hàng loạt
            </button>
            {spinMessage ? (
              <p className={`mt-2 w-full rounded-lg border px-3 py-2 text-center text-xs ${spinMessageClass}`}>
                {spinMessage}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 rounded-xl bg-zinc-50 p-3">
          <p className="text-sm font-semibold text-zinc-900">Danh sách đã phân công theo thành viên</p>
          {Object.entries(assignedTasksByMember).length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Chưa có công việc nào được phân công.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {Object.entries(assignedTasksByMember).map(([memberName, tasks]) => (
                <article key={memberName} className="rounded-lg bg-white p-3 ring-1 ring-zinc-200">
                  <p className="text-sm font-semibold text-zinc-900">{memberName}</p>
                  <ul className="mt-1 space-y-1">
                    {tasks.map((task) => (
                      <li key={task.id} className="text-sm text-zinc-600">
                        • {task.title}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-xl bg-zinc-50 p-3">
          <p className="text-sm font-semibold text-zinc-900">Lịch sử tạo/xóa kế hoạch</p>
          {planHistoryLogs.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Chưa có lịch sử cho ngày này.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {planHistoryLogs.map((log) => (
                <article key={log.id} className="rounded-lg bg-white p-3 ring-1 ring-zinc-200">
                  <p className="text-sm text-zinc-700">
                    {log.action === "create" ? "✅ Tạo kế hoạch" : "🗑️ Xóa kế hoạch"} bởi{" "}
                    <span className="font-semibold">{log.performedByName}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatHistoryDateTime(log.createdAt?.seconds) || "Đang cập nhật thời gian"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      ) : null}

      <button
        type="button"
        onClick={() => {
          clearStoredUsername();
          setToast({ text: "Đã đăng xuất.", tone: "info" });
          router.replace("/login");
        }}
        className="mt-auto rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
      >
        Dang xuat
      </button>
    </main>
  );
}
