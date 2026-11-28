import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { L as X, Q as Check, c as playNotificationChime, rt as require_react_dom, x as SpringSegmentedControl } from "./index-C7fN5fMK.js";
import { t as createLucideIcon } from "./createLucideIcon-1IqWJXqJ.js";
import { t as Play } from "./play-CxHGFyOa.js";
import { t as Volume2 } from "./volume-2-DhSWTl4V.js";
// node_modules/lucide-react/dist/esm/icons/headphones.mjs
var __iconData$2 = {
	name: "headphones",
	size: 24,
	node: [["path", {
		d: "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3",
		key: "1xhozi"
	}]]
};
__iconData$2.node;
var Headphones = createLucideIcon(__iconData$2);
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
// src/lib/soundscapes.ts
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_react_dom = require_react_dom();
var AMBIENT_SOUNDS = [
	{
		id: "off",
		label: "Silence",
		subtitle: "No background audio"
	},
	{
		id: "rain",
		label: "Soft Rain",
		subtitle: "Gentle filtered rainfall"
	},
	{
		id: "brown-noise",
		label: "Deep Focus",
		subtitle: "Warm brown noise mask"
	},
	{
		id: "ocean",
		label: "Ocean Waves",
		subtitle: "Slow rolling surf"
	},
	{
		id: "warm-pad",
		label: "Warm Drone",
		subtitle: "Harmonic ambient chord"
	}
];
var AmbientSoundscapeEngine = class {
	ctx = null;
	masterGain = null;
	activeNodes = [];
	activeSources = [];
	currentId = "off";
	volume = .45;
	ensureContext() {
		if (typeof window === "undefined") return null;
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtx) return null;
		if (!this.ctx) this.ctx = new AudioCtx();
		if (this.ctx.state === "suspended") this.ctx.resume();
		return this.ctx;
	}
	createNoiseBuffer(ctx, type) {
		const sampleRate = ctx.sampleRate;
		const length = sampleRate * 4;
		const buffer = ctx.createBuffer(2, length, sampleRate);
		for (let ch = 0; ch < 2; ch++) {
			const output = buffer.getChannelData(ch);
			if (type === "brown") {
				let lastOut = 0;
				for (let i = 0; i < length; i++) {
					const white = Math.random() * 2 - 1;
					output[i] = (lastOut + .02 * white) / 1.02;
					lastOut = output[i];
					output[i] *= 3.2;
				}
			} else {
				let b0 = 0;
				let b1 = 0;
				let b2 = 0;
				let b3 = 0;
				let b4 = 0;
				let b5 = 0;
				let b6 = 0;
				for (let i = 0; i < length; i++) {
					const white = Math.random() * 2 - 1;
					b0 = .99886 * b0 + white * .0555179;
					b1 = .99332 * b1 + white * .0750759;
					b2 = .969 * b2 + white * .153852;
					b3 = .8665 * b3 + white * .3104856;
					b4 = .55 * b4 + white * .5329522;
					b5 = -.7616 * b5 - white * .016898;
					output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * .5362) * .06;
					b6 = white * .115926;
				}
			}
		}
		return buffer;
	}
	start(soundId, volume = this.volume) {
		this.volume = Math.max(.05, Math.min(1, volume));
		this.stop();
		this.currentId = soundId;
		if (soundId === "off") return;
		const ctx = this.ensureContext();
		if (!ctx) return;
		const master = ctx.createGain();
		master.gain.setValueAtTime(1e-4, ctx.currentTime);
		master.gain.exponentialRampToValueAtTime(this.volume * .32, ctx.currentTime + .25);
		master.connect(ctx.destination);
		this.masterGain = master;
		this.activeNodes.push(master);
		if (soundId === "rain") {
			const src = ctx.createBufferSource();
			src.buffer = this.createNoiseBuffer(ctx, "pink");
			src.loop = true;
			const bandpass = ctx.createBiquadFilter();
			bandpass.type = "bandpass";
			bandpass.frequency.value = 1150;
			bandpass.Q.value = .65;
			src.connect(bandpass);
			bandpass.connect(master);
			src.start();
			this.activeSources.push(src);
			this.activeNodes.push(bandpass);
		} else if (soundId === "brown-noise") {
			const src = ctx.createBufferSource();
			src.buffer = this.createNoiseBuffer(ctx, "brown");
			src.loop = true;
			const lowpass = ctx.createBiquadFilter();
			lowpass.type = "lowpass";
			lowpass.frequency.value = 420;
			src.connect(lowpass);
			lowpass.connect(master);
			src.start();
			this.activeSources.push(src);
			this.activeNodes.push(lowpass);
		} else if (soundId === "ocean") {
			const src = ctx.createBufferSource();
			src.buffer = this.createNoiseBuffer(ctx, "brown");
			src.loop = true;
			const filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = 360;
			const lfo = ctx.createOscillator();
			lfo.type = "sine";
			lfo.frequency.value = .14;
			const lfoGain = ctx.createGain();
			lfoGain.gain.value = 220;
			lfo.connect(lfoGain);
			lfoGain.connect(filter.frequency);
			src.connect(filter);
			filter.connect(master);
			src.start();
			lfo.start();
			this.activeSources.push(src, lfo);
			this.activeNodes.push(filter, lfoGain);
		} else if (soundId === "warm-pad") {
			const freqs = [
				174.61,
				220,
				261.63,
				329.63
			];
			const filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = 620;
			filter.connect(master);
			this.activeNodes.push(filter);
			freqs.forEach((f, idx) => {
				const osc = ctx.createOscillator();
				osc.type = idx % 2 === 0 ? "sine" : "triangle";
				osc.frequency.value = f;
				const voiceGain = ctx.createGain();
				voiceGain.gain.value = .14;
				osc.connect(voiceGain);
				voiceGain.connect(filter);
				osc.start();
				this.activeSources.push(osc);
				this.activeNodes.push(voiceGain);
			});
		}
	}
	setVolume(volume) {
		this.volume = Math.max(.05, Math.min(1, volume));
		if (this.ctx && this.masterGain && this.currentId !== "off") this.masterGain.gain.setTargetAtTime(this.volume * .32, this.ctx.currentTime, .06);
	}
	stop() {
		const ctx = this.ctx;
		const gain = this.masterGain;
		const sources = this.activeSources;
		const nodes = this.activeNodes;
		this.masterGain = null;
		this.activeSources = [];
		this.activeNodes = [];
		this.currentId = "off";
		if (ctx && gain) try {
			gain.gain.cancelScheduledValues(ctx.currentTime);
			gain.gain.setTargetAtTime(1e-4, ctx.currentTime, .04);
		} catch {}
		window.setTimeout(() => {
			sources.forEach((s) => {
				try {
					s.stop();
				} catch {}
			});
			nodes.forEach((n) => {
				try {
					n.disconnect();
				} catch {}
			});
		}, 120);
	}
};
var ambientSoundscape = new AmbientSoundscapeEngine();
// src/components/FocusTimerSheet.tsx
var import_jsx_runtime = require_jsx_runtime();
var DURATION_OPTIONS = [
	{
		id: "15",
		label: "15m"
	},
	{
		id: "25",
		label: "25m"
	},
	{
		id: "45",
		label: "45m"
	},
	{
		id: "60",
		label: "60m"
	}
];
var FocusTimerSheet = ({ reminder, onCompleteTask, onClose }) => {
	const [preset, setPreset] = (0, import_react.useState)("25");
	const [secondsLeft, setSecondsLeft] = (0, import_react.useState)(1500);
	const [running, setRunning] = (0, import_react.useState)(false);
	const [soundId, setSoundId] = (0, import_react.useState)("off");
	const [volume, setVolume] = (0, import_react.useState)(.5);
	const totalSeconds = Number(preset) * 60;
	(0, import_react.useEffect)(() => {
		if (reminder) {
			setPreset("25");
			setSecondsLeft(1500);
			setRunning(false);
			setSoundId("off");
			ambientSoundscape.stop();
		}
		return () => {
			ambientSoundscape.stop();
		};
	}, [reminder]);
	(0, import_react.useEffect)(() => {
		if (!running) return;
		const id = window.setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					setRunning(false);
					ambientSoundscape.stop();
					playNotificationChime("zen");
					return 0;
				}
				return prev - 1;
			});
		}, 1e3);
		return () => window.clearInterval(id);
	}, [running]);
	(0, import_react.useEffect)(() => {
		if (!reminder) {
			ambientSoundscape.stop();
			return;
		}
		if (soundId === "off") ambientSoundscape.stop();
		else ambientSoundscape.start(soundId, volume);
	}, [reminder, soundId]);
	const handleVolumeChange = (nextVol) => {
		setVolume(nextVol);
		ambientSoundscape.setVolume(nextVol);
	};
	const handlePresetChange = (next) => {
		setPreset(next);
		setRunning(false);
		setSecondsLeft(Number(next) * 60);
	};
	const handleClose = () => {
		ambientSoundscape.stop();
		onClose();
	};
	if (!reminder) return null;
	const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
	const secs = String(secondsLeft % 60).padStart(2, "0");
	const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
	const radius = 64;
	const circ = 2 * Math.PI * radius;
	const offset = circ * (1 - progress);
	const content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "dialog",
		"aria-modal": "true",
		"aria-label": `Focus timer for ${reminder.title}`,
		className: "fixed inset-0 z-[80] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4",
		onClick: (e) => {
			if (e.target === e.currentTarget) handleClose();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass-elevated animate-sheet-up max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-3 flex justify-center sm:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-1.5 w-10 rounded-full bg-white/20" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium text-sky-300",
							children: "Focus Mode"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-0.5 truncate font-display text-lg font-bold text-white",
							children: reminder.title
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: handleClose,
						"aria-label": "Close focus timer",
						className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpringSegmentedControl, {
						options: DURATION_OPTIONS,
						value: preset,
						onChange: handlePresetChange,
						ariaLabel: "Focus duration preset",
						size: "sm",
						fullWidth: true
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "my-5 flex justify-center",
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
								stroke: "#0A84FF",
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
								children: secondsLeft === 0 ? "Session Complete" : running ? "Focusing" : "Ready"
							})]
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-white/[0.1] bg-white/[0.03] p-3.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Headphones, { className: "h-3.5 w-3.5 text-sky-300" }), "Ambient Soundscape"]
							}), soundId !== "off" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] font-medium text-emerald-300",
								children: "Playing"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2.5 flex flex-wrap gap-1.5",
							children: AMBIENT_SOUNDS.map((sound) => {
								const active = soundId === sound.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setSoundId(sound.id),
									className: `ios-spring-press min-h-[36px] rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${active ? "border-sky-400/50 bg-[#0A84FF]/25 text-white" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200"}`,
									children: sound.label
								}, sound.id);
							})
						}),
						soundId !== "off" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex items-center gap-2.5 border-t border-white/[0.06] pt-2.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "h-4 w-4 shrink-0 text-slate-400" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "range",
									min: .05,
									max: 1,
									step: .05,
									value: volume,
									"aria-label": "Ambient soundscape volume",
									onChange: (e) => handleVolumeChange(Number(e.target.value)),
									className: "h-1.5 flex-1 cursor-pointer accent-[#0A84FF]"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "w-8 text-right font-mono text-[11px] text-slate-300 tabular-nums",
									children: [Math.round(volume * 100), "%"]
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid grid-cols-2 gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setRunning((r) => !r),
						className: "liquid-primary-btn ios-spring-press flex min-h-[48px] items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white",
						children: [running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: running ? "Pause" : "Start Focus" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							setRunning(false);
							setSecondsLeft(totalSeconds);
						},
						className: "ios-spring-press flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] text-sm font-semibold text-slate-200 hover:bg-white/[0.1]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reset" })]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						ambientSoundscape.stop();
						onCompleteTask(reminder.id);
						onClose();
					},
					className: "ios-spring-press mt-2.5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Mark Reminder Completed" })]
				})
			]
		})
	});
	return typeof document !== "undefined" ? (0, import_react_dom.createPortal)(content, document.body) : content;
};
export { FocusTimerSheet };
