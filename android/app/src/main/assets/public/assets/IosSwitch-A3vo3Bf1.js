import { i as __toESM, n as require_react, t as require_jsx_runtime } from "./jsx-runtime-CWAvGazs.js";
import { t as createLucideIcon } from "./createLucideIcon-1IqWJXqJ.js";
// node_modules/lucide-react/dist/esm/icons/download.mjs
var __iconData = {
	name: "download",
	size: 24,
	node: [
		["path", {
			d: "M12 15V3",
			key: "m9g1x1"
		}],
		["path", {
			d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
			key: "ih7n3h"
		}],
		["path", {
			d: "m7 10 5 5 5-5",
			key: "brsn70"
		}]
	]
};
__iconData.node;
var Download = createLucideIcon(__iconData);
// src/components/IosSwitch.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var IosSwitch = ({ checked, onChange, ariaLabel, accent = "emerald", disabled = false }) => {
	const [pressed, setPressed] = (0, import_react.useState)(false);
	const activeTrackClass = accent === "azure" ? "bg-[#0A84FF] shadow-[0_0_16px_rgba(10,132,255,0.45)]" : accent === "coral" ? "bg-[#FF453A] shadow-[0_0_16px_rgba(255,69,58,0.45)]" : "bg-[#30D158] shadow-[0_0_16px_rgba(48,209,88,0.42)]";
	const thumbTransform = checked ? pressed ? "translate3d(17px, 0, 0) scaleX(1.14)" : "translate3d(20px, 0, 0) scaleX(1)" : pressed ? "translate3d(0px, 0, 0) scaleX(1.14)" : "translate3d(0px, 0, 0) scaleX(1)";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		role: "switch",
		"aria-checked": checked,
		"aria-label": ariaLabel,
		disabled,
		onPointerDown: () => setPressed(true),
		onPointerUp: () => setPressed(false),
		onPointerLeave: () => setPressed(false),
		onPointerCancel: () => setPressed(false),
		onClick: () => onChange(!checked),
		className: "flex min-h-[44px] min-w-[54px] shrink-0 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A84FF] disabled:opacity-50",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: `ios-switch-track relative inline-flex h-[31px] w-[51px] items-center rounded-full border border-white/15 p-[2px] ${checked ? activeTrackClass : "bg-white/[0.14]"}`,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				style: {
					transform: thumbTransform,
					transformOrigin: checked ? "right center" : "left center"
				},
				className: "ios-switch-thumb block h-[25px] w-[25px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.34),0_1px_2px_rgba(0,0,0,0.2)]"
			})
		})
	});
};
export { Download as n, IosSwitch as t };
