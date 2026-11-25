import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { t as createLucideIcon } from "./createLucideIcon-1IqWJXqJ.js";
import { O as Plus, _ as getMonthCalendarDays, g as getDateKeyFromDate, m as DAY_SHORT, u as SwipeableReminderRow, v as getTodayDateKey, x as isReminderScheduledForDate, y as getWeekStripDates } from "./index-awTncDk7.js";
// node_modules/lucide-react/dist/esm/icons/chevron-left.mjs
var __iconData$1 = {
	name: "chevron-left",
	size: 24,
	node: [["path", {
		d: "m15 18-6-6 6-6",
		key: "1wnfg3"
	}]]
};
__iconData$1.node;
var ChevronLeft = createLucideIcon(__iconData$1);
// node_modules/lucide-react/dist/esm/icons/chevron-right.mjs
var __iconData = {
	name: "chevron-right",
	size: 24,
	node: [["path", {
		d: "m9 18 6-6-6-6",
		key: "mthhwq"
	}]]
};
__iconData.node;
var ChevronRight = createLucideIcon(__iconData);
// src/components/ScheduleView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ScheduleView = ({ reminders, prefs, onAddForDate, onToggleDone, onSnooze, onDelete, onEdit, onFocus }) => {
	const todayKey = getTodayDateKey();
	const [selectedDate, setSelectedDate] = (0, import_react.useState)(() => /* @__PURE__ */ new Date());
	const [viewMonth, setViewMonth] = (0, import_react.useState)(() => {
		const d = /* @__PURE__ */ new Date();
		return new Date(d.getFullYear(), d.getMonth(), 1);
	});
	const selectedKey = getDateKeyFromDate(selectedDate);
	const weekDates = (0, import_react.useMemo)(() => getWeekStripDates(selectedDate), [selectedDate]);
	const monthDays = (0, import_react.useMemo)(() => getMonthCalendarDays(viewMonth.getFullYear(), viewMonth.getMonth()), [viewMonth]);
	const selectedDayReminders = (0, import_react.useMemo)(() => {
		return reminders.filter((r) => isReminderScheduledForDate(r, selectedDate)).sort((a, b) => a.time.localeCompare(b.time));
	}, [reminders, selectedDate]);
	const monthTitle = viewMonth.toLocaleDateString(void 0, {
		month: "long",
		year: "numeric"
	});
	const selectedDateTitle = selectedDate.toLocaleDateString(void 0, {
		weekday: "long",
		month: "short",
		day: "numeric"
	});
	const shiftMonth = (delta) => {
		setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
	};
	const jumpToday = () => {
		const now = /* @__PURE__ */ new Date();
		setSelectedDate(now);
		setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "glass-surface rounded-3xl p-5 lg:col-span-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-5 flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar",
					children: weekDates.map((d) => {
						const k = getDateKeyFromDate(d);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => {
								setSelectedDate(d);
								setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
							},
							className: `flex min-h-[58px] min-w-[44px] flex-1 flex-col items-center justify-center rounded-2xl transition-colors ${k === selectedKey ? "bg-[#2F80FF] text-white" : k === todayKey ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] font-medium opacity-75",
								children: DAY_SHORT[d.getDay()]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-0.5 font-mono text-sm font-bold tabular-nums",
								children: d.getDate()
							})]
						}, k);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2 border-t border-white/[0.08] pt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-base font-bold text-slate-50",
						children: monthTitle
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => shiftMonth(-1),
								"aria-label": "Previous month",
								className: "flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: jumpToday,
								className: "min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.1]",
								children: "Today"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => shiftMonth(1),
								"aria-label": "Next month",
								className: "flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4" })
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid grid-cols-7 gap-1.5 text-center",
					children: [DAY_SHORT.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "py-1.5 text-[11px] font-semibold text-slate-500",
						children: d
					}, d)), monthDays.map((day) => {
						const key = getDateKeyFromDate(day);
						const inMonth = day.getMonth() === viewMonth.getMonth();
						const isSelected = key === selectedKey;
						const isToday = key === todayKey;
						const scheduled = reminders.filter((r) => isReminderScheduledForDate(r, day));
						const alarmCount = scheduled.filter((r) => r.isAlarm).length;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setSelectedDate(day),
							className: `flex min-h-[48px] flex-col items-center justify-center rounded-xl border transition-colors ${isSelected ? "border-[#2F80FF] bg-[#2F80FF]/25 text-white" : isToday ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200" : "border-white/[0.05] bg-white/[0.02] text-slate-300 hover:bg-white/[0.07]"} ${inMonth ? "" : "opacity-35"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs font-semibold tabular-nums",
								children: day.getDate()
							}), scheduled.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 font-mono text-[10px] leading-none text-slate-400 tabular-nums",
								children: alarmCount > 0 ? `${scheduled.length}` : `${scheduled.length}`
							})]
						}, key);
					})]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "flex flex-col gap-4 lg:col-span-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium text-slate-400",
					children: "Selected day"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-bold text-slate-50",
					children: selectedDateTitle
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onAddForDate(selectedDate),
					className: "flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#2F80FF] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#256FE6] whitespace-nowrap shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Add for Day" })]
				})]
			}), selectedDayReminders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "glass-surface rounded-3xl px-6 py-12 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium text-slate-300",
					children: "No reminders scheduled for this date."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-slate-500",
					children: "Tap Add for Day to schedule an exact alarm or recurring task."
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col gap-2.5",
				children: selectedDayReminders.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwipeableReminderRow, {
					reminder: r,
					timeFormat: prefs.timeFormat,
					onToggleDone,
					onSnooze,
					onDelete,
					onEdit,
					onFocus
				}, r.id))
			})]
		})]
	});
};
export { ScheduleView };
