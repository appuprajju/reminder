import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { A as Check, T as X } from "./index-awTncDk7.js";
import { t as createLucideIcon } from "./createLucideIcon-1IqWJXqJ.js";
import { n as ExternalLink, t as Smartphone } from "./smartphone-C8EGrxLo.js";
// node_modules/lucide-react/dist/esm/icons/copy.mjs
var __iconData$1 = {
	name: "copy",
	size: 24,
	node: [["rect", {
		width: "14",
		height: "14",
		x: "8",
		y: "8",
		rx: "2",
		ry: "2",
		key: "17jyea"
	}], ["path", {
		d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
		key: "zix9uf"
	}]]
};
__iconData$1.node;
var Copy = createLucideIcon(__iconData$1);
// node_modules/lucide-react/dist/esm/icons/shield.mjs
var __iconData = {
	name: "shield",
	size: 24,
	node: [["path", {
		d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
		key: "oel41y"
	}]]
};
__iconData.node;
var Shield = createLucideIcon(__iconData);
// src/components/PlayStoreModal.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var BUILD_COMMANDS = `# 1. Deploy Serverless Cloudflare Edge Backend (Zero Node server needed):
cd worker && npm install
npx wrangler d1 execute reminder-db --remote --file=./schema.sql
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler deploy

# 2. Build & Package Native Android Release (.aab for Play Console):
cd .. && VITE_API_BASE_URL=https://api.makeuperfect.in npm run build
npx cap sync android
cd android && ./gradlew bundleRelease`;
var PERMISSIONS_LIST = [
	{
		name: "POST_NOTIFICATIONS",
		reason: "Delivers scheduled reminder and alarm alerts on Android 13+."
	},
	{
		name: "SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM",
		reason: "Triggers OS AlarmManager at the exact minute while the app is closed and screen is locked."
	},
	{
		name: "RECEIVE_BOOT_COMPLETED",
		reason: "Restores pending OS alarm schedules automatically after a phone restart."
	},
	{
		name: "USE_FULL_SCREEN_INTENT & WAKE_LOCK",
		reason: "Wakes the locked screen for high-priority loud alarms so you can snooze or dismiss immediately."
	},
	{
		name: "VIBRATE",
		reason: "Provides tactile haptics and alarm vibration alerts."
	}
];
var PlayStoreModal = ({ mode, onClose }) => {
	const [copied, setCopied] = (0, import_react.useState)(false);
	if (!mode) return null;
	const copyCommands = () => {
		navigator.clipboard?.writeText(BUILD_COMMANDS).then(() => {
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2e3);
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4",
		onClick: (e) => {
			if (e.target === e.currentTarget) onClose();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass-elevated animate-sheet-up flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between border-b border-white/[0.08] px-5 py-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2.5",
					children: [mode === "privacy" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-5 w-5 text-[#60A5FA]" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "h-5 w-5 text-emerald-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-bold text-white",
						children: mode === "privacy" ? "Privacy Policy" : "Google Play Store Launch Kit"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					"aria-label": "Close",
					className: "flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-slate-300",
				children: mode === "privacy" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-slate-400",
						children: ["Effective November 25, 2026 · Developer: Prajwal M (</yourstudio>) · Public URL: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-slate-200",
							children: "/privacy"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-white",
						children: "reminderme"
					}), " operates offline-first on your device with optional cloud synchronization. No account is required to schedule alarms, timers, or reminders locally."] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-bold text-white",
						children: "1. On-Device Data (Guest Mode)"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-slate-400",
						children: "Reminders, custom ringtones, preferences, and local streaks stay solely on your device via native storage and IndexedDB."
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-bold text-white",
						children: "2. Optional Cloud Sync & Push"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-slate-400",
						children: "When you create an account, we store your email, display name, salted scrypt password hash, timezone, synced reminder schedules, and device push subscription strictly to deliver alarms across devices."
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-bold text-white",
						children: "3. Device Permissions"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-slate-400",
						children: "Notification, Exact Alarm, Boot Recovery, and Vibration permissions are used exclusively for timely alarm delivery when the app is closed and the screen is locked. Optional Microphone access is used only during Voice Quick-Add and never recorded or transmitted to our servers."
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-bold text-white",
						children: "4. Data Control & Deletion"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-slate-400",
						children: [
							"We never sell or share user data with advertisers. You can export JSON backups or delete your reminders at any time. Contact",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[#60A5FA]",
								children: "admin@reminderme.app"
							}),
							" for account removal."
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: "/privacy",
						target: "_blank",
						rel: "noreferrer",
						className: "inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-xs font-semibold text-[#60A5FA] hover:bg-white/[0.08]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Open Standalone /privacy Page for Play Console" })]
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-slate-400",
								children: "Android Package ID"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-mono text-sm font-semibold text-white",
								children: "in.makeuperfect.reminderme"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-slate-400",
								children: "Target Release Format"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-mono text-sm font-semibold text-emerald-400",
								children: "Signed Android App Bundle (.aab)"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-sm font-bold text-white",
							children: "1. Build & Package Commands"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: copyCommands,
							className: "inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#60A5FA] hover:bg-white/[0.06]",
							children: [copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: copied ? "Copied" : "Copy" })]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "mt-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#060812] p-4 font-mono text-xs leading-relaxed text-slate-200",
						children: BUILD_COMMANDS
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-bold text-white",
						children: "2. Closed-App & Lock-Screen Android Permissions"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4",
						children: PERMISSIONS_LIST.map((perm) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "py-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-xs font-semibold text-slate-100",
								children: perm.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-0.5 text-xs text-slate-400",
								children: perm.reason
							})]
						}, perm.name))
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-bold text-white",
						children: "3. Play Console Submission Checklist"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-2 list-disc space-y-1.5 pl-5 text-xs text-slate-300",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Generate an upload keystore in Android Studio (Build → Generate Signed Bundle)." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"Add ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-slate-100",
									children: "google-services.json"
								}),
								" to ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-slate-100",
									children: "android/app/"
								}),
								" to activate FCM remote push alongside OS AlarmManager."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"Set Privacy Policy URL in Play Console to ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-slate-100",
									children: "https://your-domain/privacy"
								}),
								"."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"Declare Core Functionality for ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-slate-100",
									children: "USE_EXACT_ALARM"
								}),
								" (Alarm Clock & Calendar Reminder App)."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"See ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-slate-100",
									children: "PLAY_STORE_GUIDE.md"
								}),
								" in the project root for store graphics specs & Data Safety answers."
							] })
						]
					})] })
				] })
			})]
		})
	});
};
export { PlayStoreModal };
