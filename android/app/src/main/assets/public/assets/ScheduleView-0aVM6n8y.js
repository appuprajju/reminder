import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { t as createLucideIcon } from "./createLucideIcon-1IqWJXqJ.js";
import { A as Mail, I as Calendar, R as CalendarArrowDown, S as isReminderScheduledForDate, _ as getDateKeyFromDate, b as getWeekStripDates, g as formatTimeDisplay, h as DAY_SHORT, k as Plus, u as SwipeableReminderRow, v as getMonthCalendarDays, y as getTodayDateKey } from "./index-OFjXOEAy.js";
import { t as RefreshCw } from "./refresh-cw-BYRxwx1v.js";
// node_modules/lucide-react/dist/esm/icons/alarm-clock-plus.mjs
var __iconData$3 = {
	name: "alarm-clock-plus",
	size: 24,
	node: [
		["circle", {
			cx: "12",
			cy: "13",
			r: "8",
			key: "3y4lt7"
		}],
		["path", {
			d: "M5 3 2 6",
			key: "18tl5t"
		}],
		["path", {
			d: "m22 6-3-3",
			key: "1opdir"
		}],
		["path", {
			d: "M6.38 18.7 4 21",
			key: "17xu3x"
		}],
		["path", {
			d: "M17.64 18.67 20 21",
			key: "kv2oe2"
		}],
		["path", {
			d: "M12 10v6",
			key: "1bos4e"
		}],
		["path", {
			d: "M9 13h6",
			key: "1uhe8q"
		}]
	],
	aliases: ["alarm-plus"]
};
__iconData$3.node;
var AlarmClockPlus = createLucideIcon(__iconData$3);
// node_modules/lucide-react/dist/esm/icons/chevron-left.mjs
var __iconData$2 = {
	name: "chevron-left",
	size: 24,
	node: [["path", {
		d: "m15 18-6-6 6-6",
		key: "1wnfg3"
	}]]
};
__iconData$2.node;
var ChevronLeft = createLucideIcon(__iconData$2);
// node_modules/lucide-react/dist/esm/icons/chevron-right.mjs
var __iconData$1 = {
	name: "chevron-right",
	size: 24,
	node: [["path", {
		d: "m9 18 6-6-6-6",
		key: "mthhwq"
	}]]
};
__iconData$1.node;
var ChevronRight = createLucideIcon(__iconData$1);
// node_modules/lucide-react/dist/esm/icons/star.mjs
var __iconData = {
	name: "star",
	size: 24,
	node: [["path", {
		d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
		key: "r04s7s"
	}]]
};
__iconData.node;
var Star = createLucideIcon(__iconData);
// src/components/ScheduleView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ScheduleView = ({ reminders, prefs, calendarEvents, calendarLoading, calendarError, gmailMessages, gmailLoading, gmailError, hasWorkspaceAccess, onConnectGoogle, onRefreshCalendar, onRefreshGmail, onImportCalendarEvent, onImportGmailMessage, onExportAllIcs, onExportIcs, onAddForDate, onToggleDone, onToggleSubtask, onSnooze, onDelete, onEdit, onFocus }) => {
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
	const selectedDayCalendarEvents = (0, import_react.useMemo)(() => calendarEvents.filter((ev) => ev.dateKey === selectedKey), [calendarEvents, selectedKey]);
	const calendarCountByDay = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		calendarEvents.forEach((ev) => {
			map.set(ev.dateKey, (map.get(ev.dateKey) || 0) + 1);
		});
		return map;
	}, [calendarEvents]);
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
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col gap-6 lg:col-span-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "glass-surface rounded-3xl p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "no-scrollbar mb-5 flex items-center justify-between gap-1.5 overflow-x-auto",
						children: weekDates.map((d) => {
							const k = getDateKeyFromDate(d);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									setSelectedDate(d);
									setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
								},
								className: `ios-spring-press flex min-h-[58px] min-w-[44px] flex-1 flex-col items-center justify-center rounded-2xl transition-colors ${k === selectedKey ? "bg-[#0A84FF] text-white shadow-[0_6px_18px_rgba(10,132,255,0.42)]" : k === todayKey ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"}`,
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
							className: "font-display text-base font-bold text-slate-50",
							children: monthTitle
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => shiftMonth(-1),
									"aria-label": "Previous month",
									className: "ios-spring-press flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: jumpToday,
									className: "ios-spring-press min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.1]",
									children: "Today"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => shiftMonth(1),
									"aria-label": "Next month",
									className: "ios-spring-press flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1]",
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
							const calCount = calendarCountByDay.get(key) || 0;
							const totalCount = scheduled.length + calCount;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSelectedDate(day),
								className: `ios-spring-press flex min-h-[48px] flex-col items-center justify-center rounded-xl border transition-colors ${isSelected ? "border-[#0A84FF] bg-[#0A84FF]/25 text-white" : isToday ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200" : "border-white/[0.05] bg-white/[0.02] text-slate-300 hover:bg-white/[0.07]"} ${inMonth ? "" : "opacity-35"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs font-semibold tabular-nums",
									children: day.getDate()
								}), totalCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 font-mono text-[10px] leading-none text-sky-300 tabular-nums",
									children: totalCount
								})]
							}, key);
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "glass-surface rounded-3xl p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-4 w-4 text-amber-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-base font-bold text-slate-50",
							children: "Gmail Inbox to Reminder"
						})]
					}), hasWorkspaceAccess && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: gmailLoading,
						onClick: onRefreshGmail,
						"aria-label": "Refresh Gmail messages",
						className: "ios-spring-press flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-200 hover:bg-white/[0.1] disabled:opacity-50",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-4 w-4 ${gmailLoading ? "animate-spin" : ""}` })
					})]
				}), !hasWorkspaceAccess ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs leading-relaxed text-slate-400",
						children: "Connect Google to scan recent inbox emails and turn any message into an exact alarm in one tap."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onConnectGoogle,
						className: "ios-spring-press min-h-[42px] shrink-0 rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 whitespace-nowrap",
						children: "Connect Gmail"
					})]
				}) : gmailError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200",
					children: gmailError
				}) : gmailMessages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs text-slate-400",
					children: gmailLoading ? "Loading recent Gmail messages…" : "No recent primary inbox messages found."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 divide-y divide-white/[0.06]",
					children: gmailMessages.slice(0, 5).map((msg) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-start justify-between gap-3 py-3 first:pt-1 last:pb-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [msg.isStarred && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "truncate text-xs font-semibold text-white",
									children: msg.subject
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-0.5 truncate text-[11px] text-slate-400",
								children: [msg.from, msg.snippet ? ` · ${msg.snippet}` : ""]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => onImportGmailMessage(msg),
							className: "ios-spring-press inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 text-xs font-semibold text-sky-200 hover:bg-white/[0.12] whitespace-nowrap",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlarmClockPlus, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Remind" })]
						})]
					}, msg.id))
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "flex flex-col gap-4 lg:col-span-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium text-slate-400",
						children: "Selected day"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg font-bold text-slate-50",
						children: selectedDateTitle
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: onExportAllIcs,
							className: "ios-spring-press flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.1] whitespace-nowrap shrink-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarArrowDown, { className: "h-4 w-4 text-emerald-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Export .ics" })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => onAddForDate(selectedDate),
							className: "liquid-primary-btn ios-spring-press flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white whitespace-nowrap shrink-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Add for Day" })]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "glass-surface rounded-3xl p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-4 w-4 text-sky-300" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-sm font-bold text-white",
									children: "Google Calendar"
								}),
								hasWorkspaceAccess && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-xs text-slate-400 tabular-nums",
									children: [
										"· ",
										selectedDayCalendarEvents.length,
										" on day"
									]
								})
							]
						}), hasWorkspaceAccess ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: calendarLoading,
							onClick: onRefreshCalendar,
							"aria-label": "Sync Google Calendar",
							className: "ios-spring-press flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-200 hover:bg-white/[0.1] disabled:opacity-50",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-3.5 w-3.5 ${calendarLoading ? "animate-spin" : ""}` })
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onConnectGoogle,
							className: "ios-spring-press min-h-[36px] rounded-xl border border-sky-400/30 bg-sky-500/15 px-3 text-xs font-semibold text-sky-100 hover:bg-sky-500/25",
							children: "Connect"
						})]
					}), !hasWorkspaceAccess ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs leading-relaxed text-slate-400",
						children: "Sign in with Google to view your Google Calendar events alongside your alarms and add reminders directly to your calendar."
					}) : calendarError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200",
						children: calendarError
					}) : selectedDayCalendarEvents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-slate-400",
						children: calendarLoading ? "Syncing Google Calendar…" : calendarEvents.length > 0 ? `No events on ${selectedDateTitle} · ${calendarEvents.length} upcoming in the next 14 days.` : "No Google Calendar events scheduled in the next 14 days."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-2.5 divide-y divide-white/[0.06]",
						children: selectedDayCalendarEvents.map((ev) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "truncate text-xs font-semibold text-white",
									children: ev.summary
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-0.5 truncate text-[11px] text-slate-400",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-sky-300 tabular-nums",
										children: ev.allDay ? "All day" : formatTimeDisplay(ev.timeHm, prefs.timeFormat)
									}), ev.location ? ` · ${ev.location}` : ""]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => onImportCalendarEvent(ev),
								className: "ios-spring-press inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl border border-white/[0.1] bg-white/[0.06] px-2.5 text-xs font-semibold text-slate-100 hover:bg-white/[0.12] whitespace-nowrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlarmClockPlus, { className: "h-3.5 w-3.5 text-sky-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Set Alarm" })]
							})]
						}, ev.id))
					})]
				}),
				selectedDayReminders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
						onToggleSubtask,
						onSnooze,
						onDelete,
						onEdit,
						onFocus,
						onExportIcs
					}, r.id))
				})
			]
		})]
	});
};
export { ScheduleView };
