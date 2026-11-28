import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { f as api } from "./index-C7fN5fMK.js";
import { p as isReminderDoneToday, u as getTodayDateKey } from "./time-FSROXWFI.js";
// src/components/InsightsView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FEATURE_LABELS = {
	reminder_done: "Completed reminders",
	push_done: "Dismissed from lock screen",
	reminder_add: "Created reminders",
	reminder_edit: "Edited schedules",
	reminder_snooze: "Snoozed alarms",
	push_snooze: "Lock-screen snoozes",
	push_sent: "Background push delivered",
	push_test: "Instant push tests",
	push_test_delayed: "Delayed lock-screen tests",
	login: "Account sign-ins",
	signup: "New accounts"
};
var InsightsView = ({ reminders, localAnalytics, user, isOnline }) => {
	const [scope, setScope] = (0, import_react.useState)("me");
	const [serverData, setServerData] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!user || !isOnline) {
			setServerData(null);
			return;
		}
		let active = true;
		setLoading(true);
		(scope === "all" && user.admin ? api.adminAnalytics() : api.analytics()).then((data) => {
			if (active) setServerData(data);
		}).catch(() => {
			if (active) setServerData(null);
		}).finally(() => {
			if (active) setLoading(false);
		});
		return () => {
			active = false;
		};
	}, [
		isOnline,
		scope,
		user
	]);
	const data = serverData || localAnalytics;
	const todayKey = getTodayDateKey();
	const doneToday = reminders.filter((r) => isReminderDoneToday(r, todayKey)).length;
	const alarmCount = reminders.filter((r) => r.isAlarm).length;
	const streakDays = (() => {
		let streak = 0;
		const rev = [...data.last7].reverse();
		for (const d of rev) if (d.done > 0) streak++;
		else if (streak > 0) break;
		return streak || (doneToday > 0 ? 1 : 0);
	})();
	const maxDayVal = Math.max(1, ...data.last7.map((d) => Math.max(d.done, d.events)));
	const maxFeatureVal = Math.max(1, ...data.features.map((f) => f.count));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-bold text-slate-50",
					children: "Streaks & Insights"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 text-xs text-slate-400",
					children: serverData ? "Synced cloud activity" : "On-device offline metrics"
				})] }), user?.admin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "inline-flex rounded-xl border border-white/[0.08] bg-[#0F1426] p-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setScope("me"),
						className: `min-h-[38px] rounded-lg px-3.5 text-xs font-semibold transition-colors ${scope === "me" ? "bg-[#2F80FF] text-white" : "text-slate-400 hover:text-slate-200"}`,
						children: "My Account"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setScope("all"),
						className: `min-h-[38px] rounded-lg px-3.5 text-xs font-semibold transition-colors ${scope === "all" ? "bg-[#2F80FF] text-white" : "text-slate-400 hover:text-slate-200"}`,
						children: "All Users"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "glass-surface rounded-2xl p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium text-slate-400",
							children: "Active Streak"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 font-mono text-3xl font-bold text-white tabular-nums",
							children: [streakDays, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-1 text-sm font-medium text-slate-400",
								children: "days"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "glass-surface rounded-2xl p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium text-slate-400",
							children: "Done Today"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 font-mono text-3xl font-bold text-emerald-400 tabular-nums",
							children: [doneToday, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "ml-1 text-sm font-medium text-slate-400",
								children: ["/ ", reminders.length]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "glass-surface rounded-2xl p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium text-slate-400",
							children: "Loud Alarms"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 font-mono text-3xl font-bold text-white tabular-nums",
							children: alarmCount
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "glass-surface rounded-2xl p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium text-slate-400",
							children: scope === "all" ? "Total Users" : "Total Actions"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 font-mono text-3xl font-bold text-[#60A5FA] tabular-nums",
							children: scope === "all" ? data.users : data.totalEvents
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 gap-6 lg:grid-cols-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "glass-surface rounded-3xl p-5 lg:col-span-7",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-base font-bold text-slate-50",
							children: "Last 7 Days Activity"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-slate-400",
							children: loading ? "Refreshing..." : "Completions & actions"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 flex h-44 items-end gap-3",
						children: data.last7.map((d) => {
							const eventPct = Math.max(6, Math.round(d.events / maxDayVal * 100));
							const donePct = d.done > 0 ? Math.max(10, Math.round(d.done / maxDayVal * 100)) : 0;
							const shortLabel = (/* @__PURE__ */ new Date(`${d.day}T12:00:00`)).toLocaleDateString(void 0, { weekday: "short" });
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex h-full flex-1 flex-col items-center justify-end gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[11px] text-slate-400 tabular-nums",
										children: d.done > 0 ? d.done : d.events
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative flex h-32 w-full max-w-[36px] items-end overflow-hidden rounded-lg bg-white/[0.05]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: { height: `${eventPct}%` },
											className: "w-full rounded-t-lg bg-[#2F80FF]/35 transition-[height] duration-300"
										}), donePct > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: { height: `${donePct}%` },
											className: "absolute inset-x-0 bottom-0 rounded-t-lg bg-[#22C55E] transition-[height] duration-300"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] font-medium text-slate-400",
										children: shortLabel
									})
								]
							}, d.day);
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "glass-surface rounded-3xl p-5 lg:col-span-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-base font-bold text-slate-50",
						children: "Usage Breakdown"
					}), data.features.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-6 text-sm text-slate-400",
						children: "Complete or schedule reminders to populate your activity breakdown."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex flex-col gap-3",
						children: data.features.slice(0, 6).map((f) => {
							const widthPct = Math.max(8, Math.round(f.count / maxFeatureVal * 100));
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-slate-300",
										children: FEATURE_LABELS[f.feature] || f.feature.replace(/_/g, " ")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono font-semibold text-slate-100 tabular-nums",
										children: f.count
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: { width: `${widthPct}%` },
										className: "h-full rounded-full bg-[#2F80FF]"
									})
								})]
							}, f.feature);
						})
					})]
				})]
			}),
			scope === "all" && data.perUser && data.perUser.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "glass-surface overflow-x-auto rounded-3xl p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-base font-bold text-slate-50",
					children: "Registered Accounts"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "mt-4 w-full text-left text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-white/[0.08] text-slate-400",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "pb-2.5 font-semibold",
								children: "User"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "pb-2.5 font-semibold",
								children: "Reminders"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "pb-2.5 font-semibold",
								children: "Push Devices"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "pb-2.5 font-semibold text-right",
								children: "Events"
							})
						]
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
						className: "divide-y divide-white/[0.06]",
						children: data.perUser.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "text-slate-200",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-semibold",
										children: u.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-slate-500",
										children: u.email
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-3 font-mono tabular-nums",
									children: u.reminders
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-3 font-mono tabular-nums",
									children: u.devices
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-3 text-right font-mono tabular-nums",
									children: u.events
								})
							]
						}, u.email))
					})]
				})]
			})
		]
	});
};
export { InsightsView };
