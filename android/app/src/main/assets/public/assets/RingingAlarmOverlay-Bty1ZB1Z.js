import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { A as Check, M as AlarmClock, h as formatTimeDisplay, k as Clock } from "./index-awTncDk7.js";
// src/components/RingingAlarmOverlay.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var RingingAlarmOverlay = ({ reminder, timeFormat, onSnooze, onDismiss }) => {
	const trackRef = (0, import_react.useRef)(null);
	const [dragPct, setDragPct] = (0, import_react.useState)(0);
	const [dragging, setDragging] = (0, import_react.useState)(false);
	const startXRef = (0, import_react.useRef)(0);
	if (!reminder) return null;
	const handlePointerDown = (e) => {
		e.currentTarget.setPointerCapture(e.pointerId);
		startXRef.current = e.clientX;
		setDragging(true);
	};
	const handlePointerMove = (e) => {
		if (!dragging || !trackRef.current) return;
		const halfWidth = Math.max(80, trackRef.current.clientWidth / 2 - 34);
		const dx = e.clientX - startXRef.current;
		setDragPct(Math.max(-1, Math.min(1, dx / halfWidth)));
	};
	const handlePointerUp = () => {
		if (!dragging) return;
		setDragging(false);
		if (dragPct >= .65) {
			setDragPct(0);
			onDismiss();
		} else if (dragPct <= -.65) {
			setDragPct(0);
			onSnooze(5);
		} else setDragPct(0);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		role: "alertdialog",
		"aria-modal": "true",
		"aria-label": `Alarm ringing: ${reminder.title}`,
		className: "fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[#060812]/95 px-6 py-12 backdrop-blur-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pt-safe text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold tracking-wider text-red-400 uppercase",
					children: reminder.isAlarm ? "Alarm Ringing" : "Scheduled Reminder"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-mono text-6xl font-bold tracking-tight text-white tabular-nums",
					children: formatTimeDisplay(reminder.time, timeFormat)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex h-28 w-28 items-center justify-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "animate-alarm-ripple absolute inset-0 rounded-full border-2 border-red-500/60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "relative flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-[#161C34] text-red-400 shadow-2xl",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlarmClock, { className: "h-11 w-11" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-7 max-w-sm text-2xl font-bold text-white",
						children: reminder.title
					}),
					reminder.note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-xs text-sm text-slate-400",
						children: reminder.note
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "w-full max-w-sm pb-safe",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center justify-between px-1 text-xs font-semibold",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sky-400",
							children: "Slide Left · Snooze 5m"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-emerald-400",
							children: "Dismiss · Slide Right"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						ref: trackRef,
						className: "relative flex h-16 w-full items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.06] select-none touch-none",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: { opacity: dragPct < 0 ? Math.abs(dragPct) * .7 : 0 },
								className: "pointer-events-none absolute inset-y-0 left-0 right-1/2 bg-gradient-to-l from-sky-500/40 to-sky-400/70"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: { opacity: dragPct > 0 ? dragPct * .7 : 0 },
								className: "pointer-events-none absolute inset-y-0 left-1/2 right-0 bg-gradient-to-r from-emerald-500/40 to-emerald-400/70"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								onPointerDown: handlePointerDown,
								onPointerMove: handlePointerMove,
								onPointerUp: handlePointerUp,
								onPointerCancel: handlePointerUp,
								style: {
									transform: `translateX(${dragPct * 116}px)`,
									transition: dragging ? "none" : "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)"
								},
								className: "relative z-10 flex h-13 w-16 cursor-grab items-center justify-center rounded-full bg-white text-slate-950 shadow-lg active:cursor-grabbing",
								children: dragPct > .3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-5 w-5 stroke-[2.5]" }) : dragPct < -.3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-5 w-5 stroke-[2.5]" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs font-bold",
									children: "⇄"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => onSnooze(5),
							className: "min-h-[48px] rounded-xl border border-white/12 bg-white/[0.06] text-sm font-semibold text-sky-300 hover:bg-white/[0.12]",
							children: "Snooze 5 min"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onDismiss,
							className: "min-h-[48px] rounded-xl bg-[#22C55E] text-sm font-semibold text-[#060812] hover:bg-emerald-400",
							children: "Turn Off"
						})]
					})
				]
			})
		]
	});
};
export { RingingAlarmOverlay };
