import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { B as require_react_dom, E as X, N as ChevronUp, P as ChevronDown } from "./index-OFjXOEAy.js";
import { t as GoogleSignInButton } from "./GoogleSignInButton-BovHPH9A.js";
// src/components/AuthSheet.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_react_dom = require_react_dom();
var import_jsx_runtime = require_jsx_runtime();
var AuthSheet = ({ open, onGoogleSignIn, onSignIn, onSignUp, onClose }) => {
	const [showCustomServer, setShowCustomServer] = (0, import_react.useState)(false);
	const [mode, setMode] = (0, import_react.useState)("login");
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	if (!open) return null;
	const handleGoogleClick = async () => {
		setError("");
		setBusy(true);
		try {
			await onGoogleSignIn();
			onClose();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Google Sign-In failed";
			if (msg.includes("popup-closed-by-user")) setError("Sign-in popup was closed before finishing. Try again anytime.");
			else if (msg.includes("popup-blocked")) setError("Your browser blocked the sign-in popup. Please allow popups for this site.");
			else setError(msg);
		} finally {
			setBusy(false);
		}
	};
	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setBusy(true);
		try {
			if (mode === "login") await onSignIn(email.trim(), password);
			else await onSignUp(name.trim(), email.trim(), password);
			setPassword("");
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Authentication failed");
		} finally {
			setBusy(false);
		}
	};
	const content = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Sign in to reminderme",
		className: "fixed inset-0 z-[80] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4",
		onClick: (e) => {
			if (e.target === e.currentTarget && !busy) onClose();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass-elevated animate-sheet-up max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-3 flex justify-center sm:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-1.5 w-10 rounded-full bg-white/20" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg font-bold text-white",
						children: "Sign In & Cloud Sync"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs leading-relaxed text-slate-400",
						children: "Sync reminders across devices with Firebase and connect Google Calendar & Gmail directly—no separate server needed."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						"aria-label": "Close",
						className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleSignInButton, {
						onClick: handleGoogleClick,
						disabled: busy,
						label: busy ? "Connecting to Google…" : "Sign in with Google"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2.5 text-center text-[11px] text-slate-400",
						children: "Includes Firebase cloud sync · Google Calendar · Gmail reminders"
					})]
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "alert",
					className: "mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-xs leading-relaxed font-medium text-red-300",
					children: error
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 border-t border-white/[0.08] pt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							setShowCustomServer((s) => !s);
							setError("");
						},
						className: "flex min-h-[40px] w-full items-center justify-between rounded-xl px-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.05] hover:text-white",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Use self-hosted / Cloudflare Worker account" }), showCustomServer ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-4 w-4 text-slate-400" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 text-slate-400" })]
					}), showCustomServer && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: handleSubmit,
						className: "mt-3 space-y-3",
						children: [
							mode === "signup" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium text-slate-400",
									children: "Name"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									maxLength: 40,
									value: name,
									onChange: (e) => setName(e.target.value),
									placeholder: "Your name",
									className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#0A84FF] focus:outline-none sm:text-sm"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium text-slate-400",
									children: "Email"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "email",
									required: true,
									autoComplete: "email",
									value: email,
									onChange: (e) => setEmail(e.target.value),
									placeholder: "you@example.com",
									className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#0A84FF] focus:outline-none sm:text-sm"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium text-slate-400",
									children: "Password"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "password",
									required: true,
									minLength: 6,
									autoComplete: mode === "login" ? "current-password" : "new-password",
									value: password,
									onChange: (e) => setPassword(e.target.value),
									placeholder: "At least 6 characters",
									className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#0A84FF] focus:outline-none sm:text-sm"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: busy,
								className: "liquid-primary-btn ios-spring-press min-h-[46px] w-full rounded-xl text-sm font-semibold text-white disabled:opacity-50",
								children: busy ? "Working…" : mode === "login" ? "Sign In to Server" : "Create Server Account"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setMode(mode === "login" ? "signup" : "login");
									setError("");
								},
								className: "min-h-[36px] text-xs font-semibold text-sky-300 hover:underline",
								children: mode === "login" ? "Need a server account? Sign up" : "Already have one? Sign in"
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 flex justify-end",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "min-h-[40px] px-2 text-xs font-medium text-slate-400 hover:text-slate-200",
						children: "Continue in Guest Mode"
					})
				})
			]
		})
	});
	return typeof document !== "undefined" ? (0, import_react_dom.createPortal)(content, document.body) : content;
};
export { AuthSheet };
