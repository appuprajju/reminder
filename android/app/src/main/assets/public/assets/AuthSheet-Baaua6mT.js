import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { C as AuthRecoveryBanner, D as mapFirebaseAuthError, E as buildGoogleOAuthTestingError, L as X, O as FIREBASE_PROJECT_ID, S as GoogleSignInButton, rt as require_react_dom, x as SpringSegmentedControl } from "./index-C7fN5fMK.js";
// src/components/AuthSheet.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_react_dom = require_react_dom();
var import_jsx_runtime = require_jsx_runtime();
var AuthSheet = ({ open, onGoogleSignIn, onSignIn, onSignUp, onResetPassword, onTriggerIsland, onClose }) => {
	const [mode, setMode] = (0, import_react.useState)("login");
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [authError, setAuthError] = (0, import_react.useState)(null);
	const [showBlockedHelp, setShowBlockedHelp] = (0, import_react.useState)(false);
	const [resetNotice, setResetNotice] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const emailInputRef = (0, import_react.useRef)(null);
	if (!open) return null;
	const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";
	const oauthTestingGuidance = buildGoogleOAuthTestingError({
		hostname: currentHostname,
		projectId: FIREBASE_PROJECT_ID
	});
	const focusEmailFallback = () => {
		setShowBlockedHelp(false);
		setAuthError(null);
		setMode("signup");
		window.setTimeout(() => {
			emailInputRef.current?.focus();
		}, 60);
	};
	const reportError = (err, fromGoogle = false) => {
		const parsed = mapFirebaseAuthError(err, {
			hostname: currentHostname,
			projectId: FIREBASE_PROJECT_ID
		});
		if (fromGoogle && parsed.code === "auth/popup-closed-by-user") {
			setShowBlockedHelp(true);
			setAuthError(null);
			return;
		}
		setAuthError(parsed);
		if (parsed.code !== "auth/popup-closed-by-user") onTriggerIsland?.("alert", {
			title: parsed.title,
			message: parsed.message
		});
	};
	const handleGoogleClick = async () => {
		setAuthError(null);
		setShowBlockedHelp(false);
		setResetNotice("");
		setBusy(true);
		try {
			await onGoogleSignIn();
			onClose();
		} catch (err) {
			reportError(err, true);
		} finally {
			setBusy(false);
		}
	};
	const handleSubmit = async (e) => {
		e.preventDefault();
		setAuthError(null);
		setResetNotice("");
		const cleanEmail = email.trim();
		if (!cleanEmail) {
			setAuthError({
				code: "auth/invalid-email",
				title: "Email Required",
				message: "Enter your email address to continue.",
				actionKind: "none"
			});
			return;
		}
		setBusy(true);
		try {
			if (mode === "login") await onSignIn(cleanEmail, password);
			else await onSignUp(name.trim(), cleanEmail, password);
			setPassword("");
			onClose();
		} catch (err) {
			reportError(err);
		} finally {
			setBusy(false);
		}
	};
	const handleForgotPassword = async () => {
		setAuthError(null);
		setResetNotice("");
		const cleanEmail = email.trim();
		if (!cleanEmail) {
			setAuthError({
				code: "auth/invalid-email",
				title: "Enter Your Email First",
				message: "Type your account email above, then tap Forgot password to get a reset link.",
				actionKind: "none"
			});
			return;
		}
		setBusy(true);
		try {
			await onResetPassword(cleanEmail);
			setResetNotice(`Password reset link sent to ${cleanEmail}. Check your inbox or spam folder.`);
		} catch (err) {
			reportError(err);
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
						children: "Sign in with Google or Email & Password to back up and sync your alarms across devices."
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
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleSignInButton, {
							onClick: handleGoogleClick,
							disabled: busy,
							label: busy ? "Connecting to Google…" : "Sign in with Google"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2.5 text-center text-[11px] text-slate-400",
							children: "Instant Google account login · Connect Calendar & Gmail anytime"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1.5 flex justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setShowBlockedHelp((v) => !v),
								className: "min-h-[36px] px-2 text-[11px] font-medium text-amber-300/90 hover:text-amber-200 hover:underline",
								children: showBlockedHelp ? "Hide sign-in tip" : "Can’t proceed with Google Sign-In? Tip"
							})
						}),
						showBlockedHelp && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthRecoveryBanner, {
							error: oauthTestingGuidance,
							onUseEmailFallback: focusEmailFallback
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "my-5 flex items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px flex-1 bg-white/[0.1]" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[11px] font-medium text-slate-400 whitespace-nowrap",
							children: "or continue with email"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px flex-1 bg-white/[0.1]" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpringSegmentedControl, {
					ariaLabel: "Email authentication mode",
					fullWidth: true,
					value: mode,
					onChange: (next) => {
						setMode(next);
						setAuthError(null);
						setResetNotice("");
					},
					options: [{
						id: "login",
						label: "Sign In"
					}, {
						id: "signup",
						label: "Create Account"
					}]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSubmit,
					className: "mt-4 space-y-3",
					noValidate: true,
					children: [
						mode === "signup" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-medium text-slate-400",
								children: "Name"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								maxLength: 60,
								autoComplete: "name",
								value: name,
								onChange: (e) => setName(e.target.value),
								placeholder: "Your name",
								className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-medium text-slate-400",
								children: "Email"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: emailInputRef,
								type: "email",
								required: true,
								autoComplete: "email",
								value: email,
								onChange: (e) => setEmail(e.target.value),
								placeholder: "you@example.com",
								className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "auth-sheet-password",
								className: "text-xs font-medium text-slate-400",
								children: "Password"
							}), mode === "login" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: handleForgotPassword,
								className: "min-h-[36px] px-1 text-xs font-semibold text-sky-300 hover:underline disabled:opacity-50 whitespace-nowrap",
								children: "Forgot password?"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "auth-sheet-password",
							type: "password",
							required: true,
							minLength: 6,
							autoComplete: mode === "login" ? "current-password" : "new-password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							placeholder: "At least 6 characters",
							className: "mt-1 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none sm:text-sm"
						})] }),
						resetNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							role: "status",
							className: "rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-2.5 text-xs leading-relaxed font-medium text-emerald-200",
							children: resetNotice
						}),
						authError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthRecoveryBanner, {
							error: authError,
							onUseEmailFallback: authError.actionKind === "use-email-fallback" ? focusEmailFallback : void 0
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: busy,
							className: "liquid-primary-btn ios-spring-press mt-1 min-h-[48px] w-full rounded-xl text-sm font-semibold text-white disabled:opacity-50 whitespace-nowrap",
							children: busy ? "Working…" : mode === "login" ? "Sign In" : "Create Account"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 flex justify-end",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "min-h-[44px] px-2 text-xs font-medium text-slate-400 hover:text-slate-200",
						children: "Continue in Guest Mode"
					})
				})
			]
		})
	});
	return typeof document !== "undefined" ? (0, import_react_dom.createPortal)(content, document.body) : content;
};
export { AuthSheet };
