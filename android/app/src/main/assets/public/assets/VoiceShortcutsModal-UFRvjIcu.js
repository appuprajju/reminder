import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { B as Sparkles, H as Radio, L as X, Q as Check, T as getPlatformAssistantProfile, W as Mic, h as isNativeApp, n as usePWAInstall, rt as require_react_dom, t as buildAssistantDeepLink, w as detectDeviceOs, z as Square } from "./index-C7fN5fMK.js";
import { n as Download, t as IosSwitch } from "./IosSwitch-A3vo3Bf1.js";
// src/components/VoiceShortcutsModal.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_react_dom = require_react_dom();
var import_jsx_runtime = require_jsx_runtime();
var INSTANT_EXAMPLES = [
	{
		label: "Medicine 9 PM",
		phrase: "Take medicine at 9pm"
	},
	{
		label: "Alarm 6:30 AM",
		phrase: "Wake me up tomorrow at 6:30am"
	},
	{
		label: "Call Mom (30m)",
		phrase: "Call Mom in 30 minutes"
	},
	{
		label: "Report 5 PM",
		phrase: "Submit report at 5pm"
	}
];
var VoiceShortcutsModal = ({ open, liveAssistant, onExecuteAssistantUrl, onTriggerIsland, onClose }) => {
	const { isInstallable, isInstalled, install } = usePWAInstall();
	const native = isNativeApp();
	const deviceOs = (0, import_react.useMemo)(() => detectDeviceOs(), []);
	const profile = (0, import_react.useMemo)(() => getPlatformAssistantProfile(deviceOs), [deviceOs]);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);
	if (!open) return null;
	const currentOrigin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://reminder.makeuperfect.in";
	const handlePrimaryActivate = () => {
		if (deviceOs === "ios") liveAssistant.activateSiriLive();
		else if (deviceOs === "android") liveAssistant.activateGoogleAssistantLive();
		else liveAssistant.activateNeutralVoiceLive();
		onClose();
	};
	const handleOneTapExample = (phrase) => {
		onExecuteAssistantUrl(buildAssistantDeepLink(currentOrigin, {
			id: deviceOs === "ios" ? "sc_siri_add" : "sc_gassist_add",
			assistant: deviceOs === "ios" ? "siri" : "google-assistant",
			action: "add",
			defaultAlertMode: "auto",
			autoSave: true
		}, phrase));
		onClose();
	};
	const handleInstallForAssistant = async () => {
		if (await install()) onTriggerIsland?.("success", {
			title: "App Installed",
			message: "Home-screen shortcut is now ready"
		});
	};
	const isConnected = deviceOs === "ios" ? liveAssistant.siriConnected : deviceOs === "android" ? liveAssistant.googleAssistantConnected : liveAssistant.handsFreeEnabled;
	const content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "dialog",
		"aria-modal": "true",
		"aria-label": profile.sectionTitle,
		onClick: onClose,
		className: "fixed inset-0 z-[95] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			onClick: (e) => e.stopPropagation(),
			className: "glass-elevated animate-sheet-up flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pt-2.5 sm:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto h-1.5 w-10 rounded-full bg-white/20" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3 border-b border-white/[0.1] px-5 py-4 sm:px-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-lg font-bold text-white",
							children: profile.sectionTitle
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 text-xs text-slate-400",
							children: "No setup needed — tap once and speak to auto-save with EMO confirmation."
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						"aria-label": "Close voice assistant",
						className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.05] text-slate-300 hover:bg-white/[0.12] hover:text-white",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4 overflow-y-auto px-5 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6",
					children: [
						liveAssistant.oneTapActive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-2xl border border-sky-400/45 bg-sky-500/15 p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex min-w-0 items-center gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "flex h-9 w-9 shrink-0 animate-pulse items-center justify-center rounded-full bg-[#FF453A] text-white shadow-[0_0_20px_rgba(255,69,58,0.55)]",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "h-4 w-4" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm font-bold text-white",
											children: profile.listeningTitle
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-xs text-sky-200/90",
											children: liveAssistant.liveTranscript || "Say e.g. “Take medicine at 9pm” or “Wake me at 6:30am”"
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex shrink-0 items-center gap-1.5",
									children: [liveAssistant.liveTranscript && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											liveAssistant.finishOneTapSpeakNow();
											onClose();
										},
										className: "liquid-primary-btn ios-spring-press flex min-h-[40px] items-center gap-1 rounded-xl px-3 text-xs font-semibold text-white",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Save" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: liveAssistant.cancelOneTapSpeak,
										"aria-label": "Stop listening",
										className: "flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "h-3.5 w-3.5 fill-current" })
									})]
								})]
							})
						}),
						liveAssistant.errorMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-100",
							children: liveAssistant.errorMessage
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: handlePrimaryActivate,
							className: `ios-spring-press group flex min-h-[76px] w-full items-center gap-3.5 rounded-2xl border p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition-all hover:brightness-110 ${deviceOs === "ios" ? "border-indigo-400/35 bg-gradient-to-br from-indigo-500/25 via-sky-500/20 to-fuchsia-500/20 hover:border-indigo-300/55" : deviceOs === "android" ? "border-emerald-400/35 bg-gradient-to-br from-sky-500/20 via-emerald-500/20 to-amber-500/15 hover:border-emerald-300/55" : "border-sky-400/35 bg-gradient-to-br from-sky-500/22 via-blue-500/15 to-cyan-500/20 hover:border-sky-300/55"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${deviceOs === "ios" ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-[0_8px_20px_rgba(99,102,241,0.45)]" : deviceOs === "android" ? "bg-gradient-to-br from-sky-500 via-emerald-500 to-amber-400 shadow-[0_8px_20px_rgba(16,185,129,0.4)]" : "bg-gradient-to-br from-[#0A84FF] to-cyan-500 shadow-[0_8px_20px_rgba(10,132,255,0.4)]"}`,
								children: deviceOs === "android" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "h-5 w-5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-display text-base font-bold text-white",
										children: profile.buttonLabel
									}), isConnected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 shrink-0 text-emerald-400" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-0.5 text-xs text-slate-300",
									children: "Tap once & speak — auto-saves live with EMO confirmation"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.04] p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex min-w-0 items-start gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${liveAssistant.handsFreeEnabled ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300" : "border-white/[0.12] bg-white/[0.06] text-slate-300"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "h-4 w-4" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm font-bold text-white",
										children: profile.handsFreeTitle
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-0.5 text-xs leading-relaxed text-slate-400",
										children: [
											"Keep listening while reminderme is open — just say",
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
												className: "text-slate-200",
												children: profile.wakeExample
											}),
											"."
										]
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IosSwitch, {
								checked: liveAssistant.handsFreeEnabled,
								onChange: (next) => liveAssistant.setHandsFree(next, profile.source),
								ariaLabel: `Enable ${profile.handsFreeTitle}`,
								accent: "emerald"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold text-slate-300",
								children: "Try a 1-tap instant command (saves right now with EMO eyes)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2.5 grid grid-cols-2 gap-2",
								children: INSTANT_EXAMPLES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => handleOneTapExample(item.phrase),
									className: "ios-spring-press min-h-[44px] rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-left transition-colors hover:border-sky-400/40 hover:bg-sky-500/15",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-xs font-semibold text-white",
										children: item.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "truncate text-[11px] text-slate-400",
										children: [
											"“",
											item.phrase,
											"”"
										]
									})]
								}, item.phrase))
							})]
						}),
						!native && !isInstalled && isInstallable && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => void handleInstallForAssistant(),
							className: "ios-spring-press flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Install App on Home Screen" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-center text-[11px] leading-relaxed text-slate-500",
							children: profile.footerHint
						})
					]
				})
			]
		})
	});
	return typeof document !== "undefined" ? (0, import_react_dom.createPortal)(content, document.body) : content;
};
export { VoiceShortcutsModal };
