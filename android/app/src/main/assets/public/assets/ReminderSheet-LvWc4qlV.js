import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { A as Bell, D as Plus, T as Trash, a as playAlarmCycle, g as DAY_LETTERS, j as AlarmClock, n as ALARM_SOUNDS, y as getDateKeyFromDate } from "./index-MgpPl3ok.js";
import { t as Play } from "./play-CxHGFyOa.js";
import { t as X } from "./x-kMqQQxQ3.js";
// src/components/ReminderSheet.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
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
var ReminderSheet = ({ open, editing, defaultDate, defaultAlarmSound, customAudioName, availableTags, onAddCustomTag, onSave, onDelete, onClose }) => {
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
		}
		setAddingTag(false);
		setNewTagText("");
	}, [
		defaultAlarmSound,
		defaultDate,
		editing,
		open
	]);
	if (!open) return null;
	const toggleDay = (dow) => {
		setOneTimeDate(null);
		setDays((prev) => prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b));
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
			color: isAlarm ? "#2F80FF" : "#22C55E",
			priority,
			tag,
			isAlarm,
			sound: isAlarm ? sound : null
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4",
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
						className: "text-lg font-bold text-slate-50",
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
							className: "text-xs font-medium text-slate-400",
							children: "Delivery Style"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1.5 grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setIsAlarm(true),
								className: `flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-colors ${isAlarm ? "border-[#2F80FF] bg-[#2F80FF]/20 text-white" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlarmClock, { className: "h-4 w-4 text-red-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Loud Exact Alarm" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setIsAlarm(false),
								className: `flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-colors ${!isAlarm ? "border-[#2F80FF] bg-[#2F80FF]/20 text-white" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4 text-[#60A5FA]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Gentle Notification" })]
							})]
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
									className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#2F80FF] focus:outline-none sm:text-sm"
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
									className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3 font-mono text-base text-white tabular-nums focus:border-[#2F80FF] focus:outline-none sm:text-sm"
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
								maxLength: 90,
								value: note,
								onChange: (e) => setNote(e.target.value),
								placeholder: "Extra details shown on the lock screen",
								className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#2F80FF] focus:outline-none sm:text-sm"
							})]
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
									className: `flex h-11 items-center justify-center rounded-xl border font-mono text-xs font-bold transition-colors ${on ? "border-[#2F80FF] bg-[#2F80FF] text-white" : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-slate-100"}`,
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
							className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-sm text-white focus:border-[#2F80FF] focus:outline-none",
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
								className: "text-xs font-medium text-slate-400",
								children: "Priority"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1.5 grid grid-cols-3 gap-1.5",
								children: [
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
								].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setPriority(p.id),
									className: `min-h-[44px] rounded-xl border text-xs font-semibold transition-colors ${priority === p.id ? "border-[#2F80FF] bg-[#2F80FF]/20 text-white" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200"}`,
									children: p.label
								}, p.id))
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-medium text-slate-400",
								children: "Marker"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1.5 grid grid-cols-4 gap-1.5",
								children: QUICK_EMOJIS.slice(0, 4).map((em) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setEmoji(em),
									className: `min-h-[44px] rounded-xl border text-base transition-colors ${emoji === em ? "border-[#2F80FF] bg-[#2F80FF]/20" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08]"}`,
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
									className: "min-h-[44px] flex-1 rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3 text-sm text-white focus:border-[#2F80FF] focus:outline-none"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: handleCreateTag,
									className: "min-h-[44px] rounded-xl bg-[#2F80FF] px-4 text-xs font-semibold text-white",
									children: "Save"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 flex flex-wrap gap-1.5",
								children: availableTags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setTag(tag === t ? null : t),
									className: `min-h-[38px] rounded-xl border px-3 text-xs font-medium transition-colors ${tag === t ? "border-[#2F80FF] bg-[#2F80FF]/25 text-white" : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-slate-200"}`,
									children: t
								}, t))
							})
						] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2.5 border-t border-white/[0.08] px-5 py-4 pb-safe",
					children: [editing && onDelete ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							onDelete(editing.id);
							onClose();
						},
						className: "flex min-h-[48px] items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-semibold text-red-400 hover:bg-red-500/20",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delete" })]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "min-h-[48px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 text-sm font-semibold text-slate-300 hover:bg-white/[0.08]",
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "min-h-[48px] flex-1 rounded-xl bg-[#2F80FF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#256FE6]",
						children: editing ? "Save Changes" : isAlarm ? "Schedule Exact Alarm" : "Save Reminder"
					})]
				})
			]
		})
	});
};
export { ReminderSheet };
