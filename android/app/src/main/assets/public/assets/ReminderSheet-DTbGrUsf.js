import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { A as Mail, B as require_react_dom, D as Trash, E as X, F as Check, L as CalendarPlus, R as CalendarArrowDown, _ as getDateKeyFromDate, a as playAlarmCycle, d as SpringSegmentedControl, j as ListChecks, k as Plus, m as DAY_LETTERS, n as ALARM_SOUNDS } from "./index-OFjXOEAy.js";
import { t as Play } from "./play-CxHGFyOa.js";
// src/components/ReminderSheet.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_react_dom = require_react_dom();
var import_jsx_runtime = require_jsx_runtime();
var QUICK_EMOJIS = [
	"⏰",
	"🔔",
	"💧",
	"💊",
	"🎯",
	"🏃",
	"📞",
	"🌙"
];
var ReminderSheet = ({ open, editing, initialDraft, defaultDate, defaultAlarmSound, customAudioName, availableTags, onAddCustomTag, onSave, onDelete, onRequestAddToGoogleCalendar, onRequestEmailReminder, onExportIcs, onClose }) => {
	const [title, setTitle] = (0, import_react.useState)("");
	const [note, setNote] = (0, import_react.useState)("");
	const [time, setTime] = (0, import_react.useState)("08:30");
	const [isAlarm, setIsAlarm] = (0, import_react.useState)(true);
	const [sound, setSound] = (0, import_react.useState)(defaultAlarmSound);
	const [days, setDays] = (0, import_react.useState)([]);
	const [oneTimeDate, setOneTimeDate] = (0, import_react.useState)(null);
	const [priority, setPriority] = (0, import_react.useState)("med");
	const [tag, setTag] = (0, import_react.useState)(null);
	const [emoji, setEmoji] = (0, import_react.useState)("⏰");
	const [subtasks, setSubtasks] = (0, import_react.useState)([]);
	const [newSubtaskText, setNewSubtaskText] = (0, import_react.useState)("");
	const [addingTag, setAddingTag] = (0, import_react.useState)(false);
	const [newTagText, setNewTagText] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (!open) return;
		if (editing) {
			setTitle(editing.title);
			setNote(editing.note || "");
			setTime(editing.time);
			setIsAlarm(editing.isAlarm);
			setSound(editing.sound || defaultAlarmSound);
			setDays(editing.days || []);
			setOneTimeDate(editing.oneTimeDate || null);
			setPriority(editing.priority);
			setTag(editing.tag);
			setEmoji(editing.emoji || (editing.isAlarm ? "⏰" : "🔔"));
			setSubtasks(editing.subtasks ? editing.subtasks.map((s) => ({ ...s })) : []);
		} else if (initialDraft) {
			setTitle(initialDraft.title);
			setNote(initialDraft.note || "");
			setTime(initialDraft.time);
			setIsAlarm(initialDraft.isAlarm);
			setSound(defaultAlarmSound);
			setDays(initialDraft.days || []);
			setOneTimeDate(initialDraft.oneTimeDate || null);
			setPriority(initialDraft.priority);
			setTag(initialDraft.tag);
			setEmoji(initialDraft.emoji || (initialDraft.isAlarm ? "⏰" : "🔔"));
			setSubtasks([]);
		} else {
			const next = new Date(Date.now() + 18e5);
			const hh = String(next.getHours()).padStart(2, "0");
			const mm = String(Math.floor(next.getMinutes() / 5) * 5).padStart(2, "0");
			setTitle("");
			setNote("");
			setTime(`${hh}:${mm}`);
			setIsAlarm(true);
			setSound(defaultAlarmSound);
			if (defaultDate) {
				setDays([defaultDate.getDay()]);
				setOneTimeDate(getDateKeyFromDate(defaultDate));
			} else {
				setDays([]);
				setOneTimeDate(null);
			}
			setPriority("med");
			setTag(null);
			setEmoji("⏰");
			setSubtasks([]);
		}
		setNewSubtaskText("");
		setAddingTag(false);
		setNewTagText("");
	}, [
		defaultAlarmSound,
		defaultDate,
		editing,
		initialDraft,
		open
	]);
	if (!open) return null;
	const toggleDay = (dow) => {
		setOneTimeDate(null);
		setDays((prev) => prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b));
	};
	const handleAddSubtask = () => {
		const clean = newSubtaskText.trim().slice(0, 80);
		if (!clean || subtasks.length >= 25) return;
		setSubtasks((prev) => [...prev, {
			id: `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
			title: clean,
			done: false
		}]);
		setNewSubtaskText("");
	};
	const handleSubmit = (e) => {
		e.preventDefault();
		if (!title.trim()) return;
		onSave({
			id: editing?.id,
			title: title.trim(),
			note: note.trim(),
			time,
			days: days.length > 0 ? days : null,
			oneTimeDate,
			emoji,
			color: isAlarm ? "#0A84FF" : "#30D158",
			priority,
			tag,
			isAlarm,
			sound: isAlarm ? sound : null,
			subtasks
		});
		onClose();
	};
	const handleCreateTag = () => {
		const clean = newTagText.trim().slice(0, 20);
		if (!clean) return;
		onAddCustomTag(clean);
		setTag(clean);
		setNewTagText("");
		setAddingTag(false);
	};
	const sheetContent = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "dialog",
		"aria-modal": "true",
		"aria-label": editing ? "Edit schedule" : "New alarm or reminder",
		className: "fixed inset-0 z-[80] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4",
		onClick: (e) => {
			if (e.target === e.currentTarget) onClose();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleSubmit,
			className: "glass-elevated animate-sheet-up flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-center pt-3 sm:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-1.5 w-10 rounded-full bg-white/20" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between border-b border-white/[0.08] px-5 py-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg font-bold text-slate-50",
						children: editing ? "Edit Schedule" : "New Alarm or Reminder"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						"aria-label": "Close",
						className: "flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 space-y-4 overflow-y-auto px-5 py-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mb-1.5 block text-xs font-medium text-slate-400",
							children: "Delivery Style"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpringSegmentedControl, {
							ariaLabel: "Delivery style",
							fullWidth: true,
							value: isAlarm ? "alarm" : "gentle",
							onChange: (val) => setIsAlarm(val === "alarm"),
							options: [{
								id: "alarm",
								label: "Loud Exact Alarm"
							}, {
								id: "gentle",
								label: "Gentle Notification"
							}]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 gap-3 sm:grid-cols-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block sm:col-span-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium text-slate-400",
									children: "Title"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									required: true,
									maxLength: 60,
									value: title,
									onChange: (e) => setTitle(e.target.value),
									placeholder: "Morning run, Take medication...",
									className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium text-slate-400",
									children: "Time"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "time",
									required: true,
									value: time,
									onChange: (e) => setTime(e.target.value),
									className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3 font-mono text-base text-white tabular-nums focus:border-[#0A84FF] focus:outline-none sm:text-sm"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-medium text-slate-400",
								children: "Note (optional)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								maxLength: 140,
								value: note,
								onChange: (e) => setNote(e.target.value),
								placeholder: "Extra details shown on the lock screen",
								className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListChecks, { className: "h-3.5 w-3.5 text-sky-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Subtasks & Checklist" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono text-[11px] text-slate-400 tabular-nums",
										children: [subtasks.length, "/25"]
									})]
								}),
								subtasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-2.5 space-y-1.5",
									children: subtasks.map((st) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#060812]/60 px-2.5 py-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setSubtasks((prev) => prev.map((item) => item.id === st.id ? {
													...item,
													done: !item.done
												} : item)),
												"aria-label": st.done ? `Uncheck ${st.title}` : `Check ${st.title}`,
												className: `flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${st.done ? "animate-check-pop border-[#30D158] bg-[#30D158] text-[#050712]" : "border-white/35 bg-white/[0.04] text-transparent"}`,
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3 stroke-[3]" })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `min-w-0 flex-1 truncate text-xs ${st.done ? "text-slate-400 line-through" : "text-slate-100"}`,
												children: st.title
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setSubtasks((prev) => prev.filter((item) => item.id !== st.id)),
												"aria-label": `Remove ${st.title}`,
												className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/15 hover:text-red-300",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
											})
										]
									}, st.id))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2.5 flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										maxLength: 80,
										value: newSubtaskText,
										onChange: (e) => setNewSubtaskText(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleAddSubtask();
											}
										},
										placeholder: "Add a checklist step...",
										className: "min-h-[40px] min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3 text-sm text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: !newSubtaskText.trim() || subtasks.length >= 25,
										onClick: handleAddSubtask,
										className: "ios-spring-press inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-xl border border-sky-400/30 bg-sky-500/20 px-3 text-xs font-semibold text-sky-100 hover:bg-sky-500/30 disabled:opacity-45",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Step" })]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-xs font-medium text-slate-400",
								children: ["Repeat Schedule ", days.length === 0 && !oneTimeDate ? "(Every Day)" : ""]
							}), oneTimeDate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-xs text-[#60A5FA]",
								children: ["One-time · ", oneTimeDate]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 grid grid-cols-7 gap-1.5",
							children: DAY_LETTERS.map((letter, idx) => {
								const on = days.includes(idx);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => toggleDay(idx),
									className: `ios-spring-press flex h-11 items-center justify-center rounded-xl border font-mono text-xs font-bold transition-colors ${on ? "border-[#0A84FF] bg-[#0A84FF] text-white shadow-[0_4px_14px_rgba(10,132,255,0.38)]" : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-slate-100"}`,
									children: letter
								}, idx);
							})
						})] }),
						isAlarm && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "sheet-alarm-sound",
								className: "text-xs font-medium text-slate-400",
								children: "Alarm Ringtone"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => playAlarmCycle(sound),
								className: "inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#60A5FA] hover:bg-white/[0.06]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-3 w-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Preview" })]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "sheet-alarm-sound",
							value: sound,
							onChange: (e) => setSound(e.target.value),
							className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-sm text-white focus:border-[#0A84FF] focus:outline-none",
							children: [ALARM_SOUNDS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: s.id,
								children: s.label
							}, s.id)), customAudioName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: "custom",
								children: ["Device: ", customAudioName]
							})]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mb-1.5 block text-xs font-medium text-slate-400",
								children: "Priority"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpringSegmentedControl, {
								ariaLabel: "Reminder priority",
								fullWidth: true,
								size: "sm",
								value: priority,
								onChange: setPriority,
								options: [
									{
										id: "high",
										label: "High"
									},
									{
										id: "med",
										label: "Med"
									},
									{
										id: "low",
										label: "Normal"
									}
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-medium text-slate-400",
								children: "Marker"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1.5 grid grid-cols-4 gap-1.5",
								children: QUICK_EMOJIS.slice(0, 4).map((em) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setEmoji(em),
									className: `ios-spring-press min-h-[42px] rounded-xl border text-base transition-colors ${emoji === em ? "border-[#0A84FF] bg-[#0A84FF]/20" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08]"}`,
									children: em
								}, em))
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium text-slate-400",
									children: "Tag"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setAddingTag((v) => !v),
									className: "inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#60A5FA] hover:bg-white/[0.06]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "New Tag" })]
								})]
							}),
							addingTag && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									maxLength: 20,
									value: newTagText,
									onChange: (e) => setNewTagText(e.target.value),
									placeholder: "Gym, Medication, Study...",
									className: "min-h-[44px] flex-1 rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3 text-sm text-white focus:border-[#0A84FF] focus:outline-none"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: handleCreateTag,
									className: "ios-spring-press min-h-[44px] rounded-xl bg-[#0A84FF] px-4 text-xs font-semibold text-white",
									children: "Save"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 flex flex-wrap gap-1.5",
								children: availableTags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setTag(tag === t ? null : t),
									className: `ios-spring-press min-h-[38px] rounded-xl border px-3 text-xs font-medium transition-colors ${tag === t ? "border-[#0A84FF] bg-[#0A84FF]/25 text-white" : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-slate-200"}`,
									children: t
								}, t))
							})
						] }),
						editing && (onRequestAddToGoogleCalendar || onRequestEmailReminder || onExportIcs) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-t border-white/[0.08] pt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-medium text-slate-400",
								children: "Send to Calendar & Email"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3",
								children: [
									onRequestAddToGoogleCalendar && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => onRequestAddToGoogleCalendar(editing),
										className: "ios-spring-press flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarPlus, { className: "h-4 w-4 text-sky-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: editing.googleCalendarEventId ? "Re-add GCal" : "Google Cal" })]
									}),
									onRequestEmailReminder && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => onRequestEmailReminder(editing),
										className: "ios-spring-press flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-4 w-4 text-amber-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Email Alert" })]
									}),
									onExportIcs && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => onExportIcs(editing),
										className: "ios-spring-press flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarArrowDown, { className: "h-4 w-4 text-emerald-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Apple .ics" })]
									})
								]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2.5 border-t border-white/[0.08] px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:py-4",
					children: [editing && onDelete ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							onDelete(editing.id);
							onClose();
						},
						className: "ios-spring-press flex min-h-[48px] items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-semibold text-red-400 hover:bg-red-500/20",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delete" })]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "ios-spring-press min-h-[48px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 text-sm font-semibold text-slate-300 hover:bg-white/[0.08]",
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "liquid-primary-btn ios-spring-press min-h-[48px] flex-1 rounded-xl px-5 text-sm font-semibold text-white",
						children: editing ? "Save Changes" : isAlarm ? "Schedule Exact Alarm" : "Save Reminder"
					})]
				})
			]
		})
	});
	return typeof document !== "undefined" ? (0, import_react_dom.createPortal)(sheetContent, document.body) : sheetContent;
};
export { ReminderSheet };
