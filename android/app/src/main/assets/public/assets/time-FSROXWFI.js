// src/lib/time.ts
var DAY_LETTERS = [
	"S",
	"M",
	"T",
	"W",
	"T",
	"F",
	"S"
];
var DAY_SHORT = [
	"Sun",
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat"
];
function getTodayDateKey(d = /* @__PURE__ */ new Date()) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getDateKeyFromDate(d) {
	return getTodayDateKey(d);
}
function formatTimeDisplay(time24, format) {
	const [hRaw, mRaw] = (time24 || "09:00").split(":").map(Number);
	const h = Number.isFinite(hRaw) ? hRaw : 9;
	const mm = String(Number.isFinite(mRaw) ? mRaw : 0).padStart(2, "0");
	if (format === "24h") return `${String(h).padStart(2, "0")}:${mm}`;
	const period = h >= 12 ? "PM" : "AM";
	return `${h % 12 || 12}:${mm} ${period}`;
}
function formatClockParts(now, format) {
	const h = now.getHours();
	const m = String(now.getMinutes()).padStart(2, "0");
	const s = String(now.getSeconds()).padStart(2, "0");
	if (format === "24h") return {
		hm: `${String(h).padStart(2, "0")}:${m}`,
		sec: s,
		period: ""
	};
	const period = h >= 12 ? "PM" : "AM";
	return {
		hm: `${String(h % 12 || 12).padStart(2, "0")}:${m}`,
		sec: s,
		period
	};
}
function formatDaysSummary(days, oneTimeDate) {
	if (oneTimeDate) {
		if (oneTimeDate === getTodayDateKey()) return "Today";
		return (/* @__PURE__ */ new Date(`${oneTimeDate}T12:00:00`)).toLocaleDateString(void 0, {
			month: "short",
			day: "numeric"
		});
	}
	if (!days || days.length === 0 || days.length === 7) return "Daily";
	const sorted = [...days].sort((a, b) => a - b);
	if (sorted.length === 5 && sorted.join(",") === "1,2,3,4,5") return "Weekdays";
	if (sorted.length === 2 && sorted.join(",") === "0,6") return "Weekends";
	return sorted.map((d) => DAY_SHORT[d]).join(", ");
}
function computeNextDueAt(timeStr, days, from = /* @__PURE__ */ new Date()) {
	const [h, m] = (timeStr || "09:00").split(":").map(Number);
	const targetH = Number.isFinite(h) ? h : 9;
	const targetM = Number.isFinite(m) ? m : 0;
	for (let offset = 0; offset <= 7; offset++) {
		const candidate = new Date(from);
		candidate.setDate(from.getDate() + offset);
		candidate.setHours(targetH, targetM, 0, 0);
		if (days && days.length > 0 && !days.includes(candidate.getDay())) continue;
		if (candidate.getTime() > from.getTime() - 15e3) return candidate.getTime();
	}
	const fallback = new Date(from);
	fallback.setDate(from.getDate() + 1);
	fallback.setHours(targetH, targetM, 0, 0);
	return fallback.getTime();
}
function isReminderDoneToday(r, todayKey = getTodayDateKey()) {
	return r.doneDate === todayKey;
}
function isReminderScheduledForDate(r, date) {
	const key = getDateKeyFromDate(date);
	if (r.oneTimeDate) return r.oneTimeDate === key;
	if (!r.days || r.days.length === 0) return true;
	return r.days.includes(date.getDay());
}
function formatCountdown(targetMs, nowMs = Date.now()) {
	const diff = targetMs - nowMs;
	if (diff <= 0) return "Due now";
	const totalMin = Math.ceil(diff / 6e4);
	if (totalMin < 60) return `In ${totalMin}m`;
	const hrs = Math.floor(totalMin / 60);
	const mins = totalMin % 60;
	if (hrs < 24) return mins > 0 ? `In ${hrs}h ${mins}m` : `In ${hrs}h`;
	return `In ${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}
function hashToInt32(str) {
	let hash = 2166136261;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return Math.abs(hash) % 214748e4 + 100;
}
function getMonthCalendarDays(year, monthIndex) {
	const startDow = new Date(year, monthIndex, 1).getDay();
	const days = [];
	for (let i = startDow - 1; i >= 0; i--) days.push(new Date(year, monthIndex, -i));
	const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
	for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, monthIndex, d));
	while (days.length % 7 !== 0) {
		const nextIdx = days.length - startDow - daysInMonth + 1;
		days.push(new Date(year, monthIndex + 1, nextIdx));
	}
	return days;
}
function getWeekStripDates(anchor = /* @__PURE__ */ new Date()) {
	const start = new Date(anchor);
	start.setDate(anchor.getDate() - anchor.getDay());
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		return d;
	});
}
export { formatCountdown as a, getDateKeyFromDate as c, getWeekStripDates as d, hashToInt32 as f, formatClockParts as i, getMonthCalendarDays as l, isReminderScheduledForDate as m, DAY_SHORT as n, formatDaysSummary as o, isReminderDoneToday as p, computeNextDueAt as r, formatTimeDisplay as s, DAY_LETTERS as t, getTodayDateKey as u };
