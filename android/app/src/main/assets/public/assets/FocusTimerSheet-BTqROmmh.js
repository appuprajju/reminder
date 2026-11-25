import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { A as Check, T as X, o as playNotificationChime } from "./index-awTncDk7.js";
import { t as createLucideIcon } from "./createLucideIcon-1IqWJXqJ.js";
import { t as Play } from "./play-CxHGFyOa.js";
// node_modules/lucide-react/dist/esm/icons/pause.mjs
var __iconData$1 = {
	name: "pause",
	size: 24,
	node: [["rect", {
		x: "14",
		y: "3",
		width: "5",
		height: "18",
		rx: "1",
		key: "kaeet6"
	}], ["rect", {
		x: "5",
		y: "3",
		width: "5",
		height: "18",
		rx: "1",
		key: "1wsw3u"
	}]]
};
__iconData$1.node;
var Pause = createLucideIcon(__iconData$1);
// node_modules/lucide-react/dist/esm/icons/rotate-ccw.mjs
var __iconData = {
	name: "rotate-ccw",
	size: 24,
	node: [["path", {
		d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
		key: "1357e3"
	}], ["path", {
		d: "M3 3v5h5",
		key: "1xhq8a"
	}]]
};
__iconData.node;
var RotateCcw = createLucideIcon(__iconData);
// src/components/FocusTimerSheet.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var DEFAULT_SECONDS = 1500;
var FocusTimerSheet = ({ reminder, onCompleteTask, onClose }) => {
	const [secondsLeft, setSecondsLeft] = (0, import_react.useState)(DEFAULT_SECONDS);
	const [running, setRunning] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (reminder) {
			setSecondsLeft(DEFAULT_SECONDS);
			setRunning(false);
		}
	}, [reminder]);
	(0, import_react.useEffect)(() => {
		if (!running) return;
		const id = window.setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					setRunning(false);
					playNotificationChime("zen");
					return 0;
				}
				return prev - 1;
			});
		}, 1e3);
		return () => window.clearInterval(id);
	}, [running]);
	if (!reminder) return null;
	const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
	const secs = String(secondsLeft % 60).padStart(2, "0");
	const progress = 1 - secondsLeft / DEFAULT_SECONDS;
	const radius = 64;
	const circ = 2 * Math.PI * radius;
	const offset = circ * (1 - progress);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4",
		onClick: (e) => {
			if (e.target === e.currentTarget) onClose();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass-elevated animate-sheet-up w-full max-w-sm rounded-t-3xl p-6 pb-safe sm:rounded-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium text-slate-400",
						children: "Focus Session"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-0.5 truncate text-lg font-bold text-white",
						children: reminder.title
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						"aria-label": "Close focus timer",
						className: "flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "my-7 flex justify-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative h-44 w-44",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							viewBox: "0 0 160 160",
							className: "h-full w-full -rotate-90",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: "80",
								cy: "80",
								r: radius,
								fill: "none",
								stroke: "rgba(255,255,255,0.08)",
								strokeWidth: "10"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: "80",
								cy: "80",
								r: radius,
								fill: "none",
								stroke: "#2F80FF",
								strokeWidth: "10",
								strokeLinecap: "round",
								strokeDasharray: circ,
								strokeDashoffset: offset,
								className: "transition-[stroke-dashoffset] duration-300"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "absolute inset-0 flex flex-col items-center justify-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-4xl font-bold text-white tabular-nums",
								children: [
									mins,
									":",
									secs
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 text-xs text-slate-400",
								children: secondsLeft === 0 ? "Session Complete" : running ? "Focusing" : "Paused"
							})]
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setRunning((r) => !r),
						className: "flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#2F80FF] text-sm font-semibold text-white hover:bg-[#256FE6]",
						children: [running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: running ? "Pause" : "Start" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							setRunning(false);
							setSecondsLeft(DEFAULT_SECONDS);
						},
						className: "flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-slate-200 hover:bg-white/[0.08]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reset" })]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						onCompleteTask(reminder.id);
						onClose();
					},
					className: "mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Mark Reminder Completed" })]
				})
			]
		})
	});
};
export { FocusTimerSheet };
