import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { F as getLanguageOption, I as getLanguagesForState, J as Globe, L as X, M as INDIA_STATES_AND_UTS, N as filterLanguagesByQuery, P as filterStatesByQuery, Q as Check, j as APP_LANGUAGES, rt as require_react_dom, x as SpringSegmentedControl } from "./index-C7fN5fMK.js";
import { t as createLucideIcon } from "./createLucideIcon-1IqWJXqJ.js";
// node_modules/lucide-react/dist/esm/icons/map-pin.mjs
var __iconData$1 = {
	name: "map-pin",
	size: 24,
	node: [["path", {
		d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
		key: "1r0f0z"
	}], ["circle", {
		cx: "12",
		cy: "10",
		r: "3",
		key: "ilqhr7"
	}]]
};
__iconData$1.node;
var MapPin = createLucideIcon(__iconData$1);
// node_modules/lucide-react/dist/esm/icons/search.mjs
var __iconData = {
	name: "search",
	size: 24,
	node: [["path", {
		d: "m21 21-4.34-4.34",
		key: "14j7rj"
	}], ["circle", {
		cx: "11",
		cy: "11",
		r: "8",
		key: "4ej97u"
	}]]
};
__iconData.node;
var Search = createLucideIcon(__iconData);
// src/components/LanguagePickerModal.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_react_dom = require_react_dom();
var import_jsx_runtime = require_jsx_runtime();
var LanguagePickerModal = ({ open, selectedLanguage, onSelectLanguage, onClose }) => {
	const [viewMode, setViewMode] = (0, import_react.useState)("states");
	const [query, setQuery] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);
	const activeOption = (0, import_react.useMemo)(() => getLanguageOption(selectedLanguage), [selectedLanguage]);
	const filteredStates = (0, import_react.useMemo)(() => filterStatesByQuery(query), [query]);
	const filteredLanguages = (0, import_react.useMemo)(() => filterLanguagesByQuery(query), [query]);
	if (!open) return null;
	const choose = (lang) => {
		onSelectLanguage(lang.id);
		onClose();
	};
	const modal = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Choose India state or language",
		onClick: onClose,
		className: "fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			onClick: (e) => e.stopPropagation(),
			className: "glass-elevated animate-sheet-up flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-center pt-3 sm:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-1.5 w-10 rounded-full bg-white/20" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3 border-b border-white/[0.1] px-5 py-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "h-5 w-5 shrink-0 text-sky-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-display text-lg font-bold text-white",
								children: "India State & Regional Languages"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-0.5 text-xs text-slate-400",
							children: [
								"All 28 States, 8 Union Territories & 22 Scheduled + Regional Languages · Active:",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-semibold text-sky-300",
									children: [
										activeOption.nativeName,
										" (",
										activeOption.name,
										")"
									]
								})
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						"aria-label": "Close language picker",
						className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 border-b border-white/[0.08] px-5 py-3.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								value: query,
								onChange: (e) => setQuery(e.target.value),
								placeholder: "Search state (Karnataka, Tamil Nadu, Assam…) or language (ಕನ್ನಡ, हिन्दी…)",
								className: "min-h-[44px] w-full rounded-xl border border-white/[0.12] bg-[#060812]/80 pr-9 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none"
							}),
							query && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setQuery(""),
								"aria-label": "Clear search",
								className: "absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.08] hover:text-white",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpringSegmentedControl, {
						ariaLabel: "Browse by Indian state or language",
						fullWidth: true,
						value: viewMode,
						onChange: setViewMode,
						options: [{
							id: "states",
							label: `By State / UT (${INDIA_STATES_AND_UTS.length})`
						}, {
							id: "languages",
							label: `All Languages (${APP_LANGUAGES.length})`
						}]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex-1 overflow-y-auto px-5 py-4",
					children: viewMode === "states" ? filteredStates.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-10 text-center text-sm text-slate-400",
						children: "No matching Indian state or language found."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-1 gap-2.5 sm:grid-cols-2",
						children: filteredStates.map((region) => {
							const langs = getLanguagesForState(region.id);
							const primary = langs[0];
							const hasActive = langs.some((l) => l.id === activeOption.id);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `rounded-2xl border p-3.5 transition-colors ${hasActive ? "border-sky-400/45 bg-sky-500/12" : "border-white/[0.09] bg-white/[0.03]"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex min-w-0 items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-3.5 w-3.5 shrink-0 text-sky-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-sm font-semibold text-white",
											children: region.name
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "shrink-0 font-mono text-[10px] uppercase text-slate-400",
										children: region.kind === "state" ? "State" : "UT"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-2.5 flex flex-wrap gap-1.5",
									children: langs.map((lang) => {
										const isSelected = lang.id === activeOption.id;
										const isPrimary = lang.id === primary.id;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => choose(lang),
											className: `ios-spring-press inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors ${isSelected ? "border-sky-400/60 bg-[#0A84FF] text-white" : isPrimary ? "border-white/[0.16] bg-white/[0.09] text-white hover:bg-white/[0.16]" : "border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1] hover:text-white"}`,
											children: [
												isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3 shrink-0" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: lang.nativeName }),
												lang.nativeName !== lang.name && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[10px] opacity-75",
													children: ["· ", lang.name]
												})
											]
										}, `${region.id}-${lang.id}`);
									})
								})]
							}, region.id);
						})
					}) : filteredLanguages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-10 text-center text-sm text-slate-400",
						children: "No matching language found."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-1 gap-2 sm:grid-cols-2",
						children: filteredLanguages.map((lang) => {
							const isSelected = lang.id === activeOption.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => choose(lang),
								className: `ios-spring-press flex min-h-[68px] items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors ${isSelected ? "border-sky-400/60 bg-[#0A84FF]/20 text-white" : "border-white/[0.09] bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-base font-bold text-white",
											children: lang.nativeName
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-medium text-slate-300",
											children: lang.name
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-0.5 truncate text-[11px] text-slate-400",
										children: [lang.states.slice(0, 3).join(", "), lang.states.length > 3 ? ` +${lang.states.length - 3}` : ""]
									})]
								}), isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0A84FF] text-white",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" })
								})]
							}, lang.id);
						})
					})
				})
			]
		})
	});
	return typeof document !== "undefined" ? (0, import_react_dom.createPortal)(modal, document.body) : modal;
};
export { LanguagePickerModal };
