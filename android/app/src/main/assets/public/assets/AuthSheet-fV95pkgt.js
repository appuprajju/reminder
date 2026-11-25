import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { T as X } from "./index-awTncDk7.js";
// src/components/AuthSheet.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var AuthSheet = ({ open, onSignIn, onSignUp, onClose }) => {
	const [mode, setMode] = (0, import_react.useState)("login");
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	if (!open) return null;
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4",
		onClick: (e) => {
			if (e.target === e.currentTarget) onClose();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleSubmit,
			className: "glass-elevated animate-sheet-up w-full max-w-md rounded-t-3xl p-6 pb-safe sm:rounded-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-bold text-white",
						children: mode === "login" ? "Sign In to Sync" : "Create Account"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-0.5 text-xs text-slate-400",
						children: "Sync reminders across devices & enable cloud push backup."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						"aria-label": "Close",
						className: "flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 space-y-3.5",
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
								className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#2F80FF] focus:outline-none sm:text-sm"
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
								className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#2F80FF] focus:outline-none sm:text-sm"
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
								className: "mt-1.5 min-h-[44px] w-full rounded-xl border border-white/[0.1] bg-[#060812]/80 px-3.5 text-base text-white focus:border-[#2F80FF] focus:outline-none sm:text-sm"
							})]
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							role: "alert",
							className: "text-xs font-medium text-red-400",
							children: error
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: busy,
					className: "mt-5 min-h-[48px] w-full rounded-xl bg-[#2F80FF] text-sm font-semibold text-white transition-colors hover:bg-[#256FE6] disabled:opacity-50",
					children: busy ? "Working..." : mode === "login" ? "Sign In" : "Create Account"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex items-center justify-between text-xs text-slate-400",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setMode(mode === "login" ? "signup" : "login");
							setError("");
						},
						className: "min-h-[36px] font-semibold text-[#60A5FA] hover:underline",
						children: mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "min-h-[36px] text-slate-400 hover:text-slate-200",
						children: "Stay in Guest Mode"
					})]
				})
			]
		})
	});
};
export { AuthSheet };
