(function () {
	"use strict";

	const state = {
		offsetMs: 0,
	};

	const CN_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

	function toChineseNumber(num) {
		if (num < 10) {
			return CN_DIGITS[num];
		}
		if (num < 20) {
			if (num === 10) {
				return "十";
			}
			return `十${CN_DIGITS[num % 10]}`;
		}
		const tens = Math.floor(num / 10);
		const ones = num % 10;
		return `${CN_DIGITS[tens]}十${ones ? CN_DIGITS[ones] : ""}`;
	}

	const wheelLabels = {
		months: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
		days: Array.from({ length: 31 }, (_, i) => `${toChineseNumber(i + 1)}号`),
		weeks: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
		periods: ["上午", "下午"],
		hours: Array.from({ length: 24 }, (_, i) => `${toChineseNumber(i)}点`),
		minutes: Array.from({ length: 60 }, (_, i) => `${toChineseNumber(i)}分`),
		seconds: Array.from({ length: 60 }, (_, i) => `${toChineseNumber(i)}秒`),
	};

	const matrixLabels = {
		months: wheelLabels.months,
		days: Array.from({ length: 31 }, (_, i) => `${toChineseNumber(i + 1)}号`),
		weeks: wheelLabels.weeks,
		hours: Array.from({ length: 24 }, (_, i) => `${toChineseNumber(i)}点`),
		minutes: Array.from({ length: 60 }, (_, i) => `${toChineseNumber(i)}分`),
		seconds: Array.from({ length: 60 }, (_, i) => `${toChineseNumber(i)}秒`),
	};

	const dom = {
		tabs: Array.from(document.querySelectorAll(".tab")),
		pages: Array.from(document.querySelectorAll(".page")),
		fullscreen: document.getElementById("fullscreen"),
		time: document.getElementById("time"),
		solarDate: document.getElementById("solarDate"),
		lunarDate: document.getElementById("lunarDate"),
		ganzhi: document.getElementById("ganzhi"),
		extraInfo: document.getElementById("extraInfo"),
		matrixContainer: document.getElementById("matrixContainer"),
		canvas: document.getElementById("wheelCanvas"),
	};

	if (dom.ganzhi) {
		dom.ganzhi.style.display = "none";
	}

	const ctx = dom.canvas.getContext("2d");
	const rootStyle = getComputedStyle(document.documentElement);
	const themeColors = {
		muted: rootStyle.getPropertyValue("--muted").trim() || "#8b949e",
		accent: rootStyle.getPropertyValue("--accent").trim() || "#00d4ff",
	};
	const wheelState = {
		month: 0,
		day: 0,
		week: 0,
		period: 0,
		hour: 0,
		minute: 0,
		second: 0,
	};
	const MATRIX_FIXED_FONT_SIZE = 46;
	let wheelStarted = false;
	let lunarReady = false;
	let solarFromDate = null;

	function resolveLunarApi() {
		if (window.Lunar && window.Lunar.Solar && typeof window.Lunar.Solar.fromDate === "function") {
			solarFromDate = window.Lunar.Solar.fromDate.bind(window.Lunar.Solar);
			lunarReady = true;
			return;
		}

		if (window.Solar && typeof window.Solar.fromDate === "function") {
			solarFromDate = window.Solar.fromDate.bind(window.Solar);
			lunarReady = true;
			return;
		}

		solarFromDate = null;
		lunarReady = false;
	}

	function getNow() {
		return new Date(Date.now() + state.offsetMs);
	}

	async function ensureLunarLibrary() {
		resolveLunarApi();
		if (lunarReady) {
			return;
		}

		try {
			await loadScript("https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.min.js");
			resolveLunarApi();
		} catch (error) {
			console.warn("农历库加载失败，将仅显示公历", error);
		}
	}

	function loadScript(src) {
		return new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = src;
			script.async = true;
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	async function syncTime() {
		try {
			const response = await fetch("https://worldtimeapi.org/api/ip", { cache: "no-store" });
			const data = await response.json();
			const serverMs = new Date(data.datetime).getTime();
			const localMs = Date.now();
			state.offsetMs = serverMs - localMs;
		} catch (error) {
			console.info("网络校时失败，使用本地时间", error);
		}
	}

	function updateTimeView(now) {
		const h = now.getHours();
		const m = now.getMinutes();
		const s = now.getSeconds();

		dom.time.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
		dom.solarDate.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${"日一二三四五六"[now.getDay()]}`;
	}

	function updateLunarView(now) {
		if (!lunarReady) {
			dom.lunarDate.textContent = "农历信息加载中";
			dom.ganzhi.textContent = "";
			dom.extraInfo.textContent = "";
			return;
		}

		try {
			const solar = solarFromDate(now);
			const lunar = solar.getLunar();
			const lunarText = `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
			const ganzhiText = `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`;
			dom.lunarDate.textContent = `${ganzhiText} ${lunarText}`;
			dom.ganzhi.textContent = "";

			const extraParts = [];
			const jieqi = typeof lunar.getJieQi === "function" ? lunar.getJieQi() : "";
			const yi = typeof lunar.getDayYi === "function" ? lunar.getDayYi() : [];
			const ji = typeof lunar.getDayJi === "function" ? lunar.getDayJi() : [];
			const yiList = Array.isArray(yi) ? yi : [];
			const jiList = Array.isArray(ji) ? ji : [];

			if (jieqi) {
				extraParts.push(`节气：${jieqi}`);
			}
			if (yiList.length) {
				extraParts.push(`宜：${yiList.slice(0, 3).join("、")}`);
			}
			if (jiList.length) {
				extraParts.push(`忌：${jiList.slice(0, 3).join("、")}`);
			}

			dom.extraInfo.textContent = extraParts.join("  ");
		} catch (error) {
			dom.lunarDate.textContent = "农历信息获取失败";
			dom.ganzhi.textContent = "";
			dom.extraInfo.textContent = "";
			console.warn("农历信息更新失败", error);
		}
	}

	function createMatrixCells() {
		dom.matrixContainer.innerHTML = "";

		const groups = [
			["month", matrixLabels.months],
			["day", matrixLabels.days],
			["week", matrixLabels.weeks],
			["hour", matrixLabels.hours],
			["minute", matrixLabels.minutes],
			["second", matrixLabels.seconds],
		];

		groups.forEach(([group, list]) => {
			list.forEach((text, index) => {
				const span = document.createElement("span");
				span.className = "matrixCell";
				span.textContent = text;
				span.dataset.group = group;
				span.dataset.index = String(index);
				dom.matrixContainer.appendChild(span);
			});
		});
	}

	function highlightGroup(group, index) {
		const cells = document.querySelectorAll(`[data-group="${group}"]`);
		cells.forEach((cell, cellIndex) => {
			cell.classList.toggle("active", cellIndex === index);
		});
	}

	function fitMatrixFont() {
		dom.matrixContainer.style.setProperty("--matrix-font-size", `${MATRIX_FIXED_FONT_SIZE}px`);
	}

	function updateMatrix(now) {
		highlightGroup("month", now.getMonth());
		highlightGroup("day", now.getDate() - 1);
		highlightGroup("week", now.getDay());
		highlightGroup("hour", now.getHours());
		highlightGroup("minute", now.getMinutes());
		highlightGroup("second", now.getSeconds());
	}

	function resizeCanvas() {
		dom.canvas.width = dom.canvas.offsetWidth;
		dom.canvas.height = dom.canvas.offsetHeight;
	}

	function circularDelta(target, current, length) {
		let delta = target - current;
		while (delta > length / 2) {
			delta -= length;
		}
		while (delta < -length / 2) {
			delta += length;
		}
		return delta;
	}

	function normalizeIndex(index, length) {
		let n = index % length;
		if (n < 0) {
			n += length;
		}
		return n;
	}

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function getWheelTargets(now) {
		const secFloat = now.getSeconds();
		const minFloat = now.getMinutes();
		const hourFloat = now.getHours();
		const periodFloat = now.getHours() < 12 ? 0 : 1;
		const dayFloat = now.getDate() - 1;
		const weekFloat = now.getDay();
		const monthFloat = now.getMonth();

		return {
			month: monthFloat,
			day: dayFloat,
			week: weekFloat,
			period: periodFloat,
			hour: hourFloat,
			minute: minFloat,
			second: secFloat,
		};
	}

	function drawRing(list, currentFloat, radius, fontSize, centerX, centerY, activeAngle, activeFontBoost = 2, activeAlign = "center", activeOffset = 0) {
		const step = (Math.PI * 2) / list.length;
		const activeIndex = normalizeIndex(Math.floor(currentFloat), list.length);

		list.forEach((text, i) => {
			if (i === activeIndex) {
				return;
			}

			const angle = activeAngle + (currentFloat - i) * step;
			const x = centerX + Math.cos(angle) * radius;
			const y = centerY + Math.sin(angle) * radius;

			ctx.fillStyle = themeColors.muted;
			ctx.shadowBlur = 0;
			ctx.font = `${fontSize}px sans-serif`;
			ctx.globalAlpha = 0.62;

			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(angle);
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(text, 0, 0);
			ctx.restore();
		});

		const activeText = list[activeIndex];
		const activeX = centerX + Math.cos(activeAngle) * radius;
		const activeY = centerY + Math.sin(activeAngle) * radius;
		ctx.fillStyle = themeColors.accent;
		ctx.shadowColor = themeColors.accent;
		ctx.shadowBlur = 16;
		ctx.font = `${fontSize + activeFontBoost}px sans-serif`;
		ctx.globalAlpha = 1;
		ctx.save();
		ctx.translate(activeX, activeY);
		ctx.rotate(activeAngle);
		ctx.textAlign = activeAlign;
		ctx.textBaseline = "middle";
		ctx.fillText(activeText, activeOffset, 0);
		ctx.restore();

		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}

	function drawPeriodBridge(currentFloat, radius, fontSize, centerX, centerY, activeAngle) {
		const activeIndex = currentFloat < 1 ? 0 : 1;
		const inactiveIndex = activeIndex === 0 ? 1 : 0;
		const baseX = centerX + Math.cos(activeAngle) * radius;
		const baseY = centerY + Math.sin(activeAngle) * radius;
		const offsetY = fontSize + 6;
		const inactiveY = activeIndex === 0 ? baseY + offsetY : baseY - offsetY;

		ctx.save();
		ctx.translate(baseX, baseY);
		ctx.rotate(activeAngle);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = themeColors.accent;
		ctx.shadowColor = themeColors.accent;
		ctx.shadowBlur = 16;
		ctx.font = `${fontSize}px sans-serif`;
		ctx.globalAlpha = 1;
		ctx.fillText(wheelLabels.periods[activeIndex], 0, 0);
		ctx.restore();

		ctx.save();
		ctx.translate(baseX, inactiveY);
		ctx.rotate(activeAngle);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = themeColors.muted;
		ctx.shadowBlur = 0;
		ctx.font = `${fontSize}px sans-serif`;
		ctx.globalAlpha = 0.92;
		ctx.fillText(wheelLabels.periods[inactiveIndex], 0, 0);
		ctx.restore();

		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}

	function getLabelWidth(text, fontSize) {
		ctx.save();
		ctx.font = `${fontSize}px sans-serif`;
		const width = ctx.measureText(text).width;
		ctx.restore();
		return width;
	}

	function getMaxLabelWidth(list, fontSize) {
		ctx.save();
		ctx.font = `${fontSize}px sans-serif`;
		let maxWidth = 0;
		for (let i = 0; i < list.length; i += 1) {
			maxWidth = Math.max(maxWidth, ctx.measureText(list[i]).width);
		}
		ctx.restore();
		return maxWidth;
	}

	function drawWheelFrame() {
		const now = getNow();
		const targets = getWheelTargets(now);
		const easing = 0.28;
		const snapEpsilon = 0.002;

		wheelState.month += circularDelta(targets.month, wheelState.month, wheelLabels.months.length) * easing;
		wheelState.day += circularDelta(targets.day, wheelState.day, wheelLabels.days.length) * easing;
		wheelState.week += circularDelta(targets.week, wheelState.week, wheelLabels.weeks.length) * easing;
		wheelState.period = targets.period;
		wheelState.hour += circularDelta(targets.hour, wheelState.hour, wheelLabels.hours.length) * easing;
		wheelState.minute += circularDelta(targets.minute, wheelState.minute, wheelLabels.minutes.length) * easing;
		wheelState.second += circularDelta(targets.second, wheelState.second, wheelLabels.seconds.length) * easing;

		if (Math.abs(circularDelta(targets.month, wheelState.month, wheelLabels.months.length)) < snapEpsilon) {
			wheelState.month = targets.month;
		}
		if (Math.abs(circularDelta(targets.day, wheelState.day, wheelLabels.days.length)) < snapEpsilon) {
			wheelState.day = targets.day;
		}
		if (Math.abs(circularDelta(targets.week, wheelState.week, wheelLabels.weeks.length)) < snapEpsilon) {
			wheelState.week = targets.week;
		}
		if (Math.abs(circularDelta(targets.hour, wheelState.hour, wheelLabels.hours.length)) < snapEpsilon) {
			wheelState.hour = targets.hour;
		}
		if (Math.abs(circularDelta(targets.minute, wheelState.minute, wheelLabels.minutes.length)) < snapEpsilon) {
			wheelState.minute = targets.minute;
		}
		if (Math.abs(circularDelta(targets.second, wheelState.second, wheelLabels.seconds.length)) < snapEpsilon) {
			wheelState.second = targets.second;
		}

		wheelState.month = normalizeIndex(wheelState.month, wheelLabels.months.length);
		wheelState.day = normalizeIndex(wheelState.day, wheelLabels.days.length);
		wheelState.week = normalizeIndex(wheelState.week, wheelLabels.weeks.length);
		wheelState.period = normalizeIndex(wheelState.period, wheelLabels.periods.length);
		wheelState.hour = normalizeIndex(wheelState.hour, wheelLabels.hours.length);
		wheelState.minute = normalizeIndex(wheelState.minute, wheelLabels.minutes.length);
		wheelState.second = normalizeIndex(wheelState.second, wheelLabels.seconds.length);

		ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);

		const minSide = Math.min(dom.canvas.width, dom.canvas.height);
		const maxRadius = Math.max(44, minSide / 2 - 4);
		const isSmall = minSide < 700;
		const centerX = dom.canvas.width / 2;
		const centerY = dom.canvas.height / 2;
		const activeAngle = 0;

		const unifiedFont = isSmall ? 10 : 12;
		const ringFonts = {
			month: unifiedFont,
			day: unifiedFont,
			week: unifiedFont,
			period: unifiedFont,
			hour: unifiedFont,
			minute: unifiedFont,
			second: unifiedFont,
		};

		// Alternative layout strategy: derive anchor radii from item count and font height.
		// For radial text, tangential density is governed mainly by font size rather than text width.
		const anchorGap = isSmall ? 1.2 : 1.6;
		let dayRadius = (wheelLabels.days.length * (ringFonts.day + anchorGap)) / (Math.PI * 2);
		let minuteRadius = (wheelLabels.minutes.length * (ringFonts.minute + anchorGap)) / (Math.PI * 2);

		dayRadius = clamp(dayRadius, maxRadius * 0.28, maxRadius * 0.48);
		minuteRadius = clamp(minuteRadius, maxRadius * 0.52, maxRadius * 0.78);

		const dayAttachGap = isSmall ? 30 : 38;
		const minuteAttachGap = isSmall ? 38 : 50;

		let innerMonthRadius = dayRadius - dayAttachGap;
		let weekRadius = dayRadius + dayAttachGap;
		let hourRadius = minuteRadius - minuteAttachGap;
		let secondRadius = minuteRadius + minuteAttachGap;
		let periodRadius = (weekRadius + hourRadius) / 2;

		const radialPadding = isSmall ? 10 : 12;
		const boosted = {
			month: ringFonts.month,
			day: ringFonts.day,
			week: ringFonts.week,
			period: ringFonts.period,
			hour: ringFonts.hour,
			minute: ringFonts.minute,
			second: ringFonts.second,
		};
		const needGap = (a, b) => ((boosted[a] + boosted[b]) * 0.5) + radialPadding;

		const mdGap = Math.max(needGap("month", "day") - (isSmall ? 5 : 7), isSmall ? 6 : 8);
		const dwGap = needGap("day", "week");
		const wpGap = needGap("week", "period");
		const phGap = needGap("period", "hour");
		const hmGap = Math.max(needGap("hour", "minute") - (isSmall ? 4 : 6), isSmall ? 6 : 8);
		const msGap = needGap("minute", "second") + (isSmall ? 6 : 8);

		innerMonthRadius = Math.min(innerMonthRadius, dayRadius - mdGap);
		weekRadius = Math.max(weekRadius, dayRadius + dwGap);
		periodRadius = Math.max(periodRadius, weekRadius + wpGap);
		hourRadius = Math.max(hourRadius, periodRadius + phGap);
		minuteRadius = Math.max(minuteRadius, hourRadius + hmGap);
		secondRadius = Math.max(secondRadius, minuteRadius + msGap);

		const secondMax = maxRadius * 0.97;
		if (secondRadius > secondMax) {
			const pullBack = secondRadius - secondMax;
			innerMonthRadius -= pullBack;
			dayRadius -= pullBack;
			weekRadius -= pullBack;
			periodRadius -= pullBack;
			hourRadius -= pullBack;
			minuteRadius -= pullBack;
			secondRadius -= pullBack;
		}

		innerMonthRadius = clamp(innerMonthRadius, maxRadius * 0.12, dayRadius - mdGap);
		weekRadius = clamp(weekRadius, dayRadius + dwGap, periodRadius - wpGap);
		periodRadius = clamp(periodRadius, weekRadius + wpGap, hourRadius - phGap);
		hourRadius = clamp(hourRadius, periodRadius + phGap, minuteRadius - hmGap);
		secondRadius = clamp(secondRadius, minuteRadius + msGap, maxRadius * 0.97);

		// Hard guard for 3 o'clock active row: use fixed max widths from adjacent rings.
		const activeRowPad = isSmall ? 4 : 6;
		const tightPairPad = isSmall ? 1 : 2;
		const wMonthRef = getLabelWidth("十二月", ringFonts.month);
		const wHourRef = getLabelWidth("二十三点", ringFonts.hour);
		const wMonth = getMaxLabelWidth(wheelLabels.months, ringFonts.month);
		const wDay = getMaxLabelWidth(wheelLabels.days, ringFonts.day);
		const wWeek = getMaxLabelWidth(wheelLabels.weeks, ringFonts.week);
		const wPeriod = getMaxLabelWidth(wheelLabels.periods, ringFonts.period);
		const wHour = getMaxLabelWidth(wheelLabels.hours, ringFonts.hour);
		const wMinute = getMaxLabelWidth(wheelLabels.minutes, ringFonts.minute);
		const wSecond = getMaxLabelWidth(wheelLabels.seconds, ringFonts.second);

		const requireGap = (leftRadius, leftWidth, rightRadius, rightWidth, pad = activeRowPad) => {
			const required = (leftWidth + rightWidth) * 0.5 + pad;
			return Math.max(rightRadius, leftRadius + required);
		};

		dayRadius = requireGap(innerMonthRadius, wMonthRef, dayRadius, wDay, tightPairPad);
		weekRadius = requireGap(dayRadius, wDay, weekRadius, wWeek);
		periodRadius = requireGap(weekRadius, wWeek, periodRadius, wPeriod);
		hourRadius = requireGap(periodRadius, wPeriod, hourRadius, wHour);
		minuteRadius = requireGap(hourRadius, wHourRef, minuteRadius, wMinute, tightPairPad);
		secondRadius = requireGap(minuteRadius, wMinute, secondRadius, wSecond);

		if (secondRadius > maxRadius * 0.97) {
			const overflow = secondRadius - maxRadius * 0.97;
			innerMonthRadius -= overflow;
			dayRadius -= overflow;
			weekRadius -= overflow;
			periodRadius -= overflow;
			hourRadius -= overflow;
			minuteRadius -= overflow;
			secondRadius -= overflow;
		}

		const rings = [
			// Inner ring: month -> day -> week, transition: period, outer ring: hour -> minute -> second
			[wheelLabels.months, wheelState.month, innerMonthRadius, ringFonts.month, centerX, centerY, activeAngle, 0, "center", 0],
			[wheelLabels.days, wheelState.day, dayRadius, ringFonts.day, centerX, centerY, activeAngle, 0, "center", 0],
			[wheelLabels.weeks, wheelState.week, weekRadius, ringFonts.week, centerX, centerY, activeAngle, 0, "center", 0],
			[wheelLabels.hours, wheelState.hour, hourRadius, ringFonts.hour, centerX, centerY, activeAngle, 0, "center", 0],
			[wheelLabels.minutes, wheelState.minute, minuteRadius, ringFonts.minute, centerX, centerY, activeAngle, 0, "center", 0],
			[wheelLabels.seconds, wheelState.second, secondRadius, ringFonts.second, centerX, centerY, activeAngle, 0, "center", 0],
		];

		rings.forEach(([list, value, radius, fontSize, ringCenterX, ringCenterY, ringActiveAngle, activeFontBoost, activeAlign, activeOffset]) => {
			drawRing(list, value, radius, fontSize, ringCenterX, ringCenterY, ringActiveAngle, activeFontBoost, activeAlign, activeOffset);
		});

		drawPeriodBridge(wheelState.period, periodRadius, ringFonts.period, centerX, centerY, activeAngle);

		requestAnimationFrame(drawWheelFrame);
	}

	function startWheelAnimation() {
		if (wheelStarted) {
			return;
		}
		const now = getNow();
		const targets = getWheelTargets(now);
		wheelState.month = normalizeIndex(targets.month, wheelLabels.months.length);
		wheelState.day = normalizeIndex(targets.day, wheelLabels.days.length);
		wheelState.week = normalizeIndex(targets.week, wheelLabels.weeks.length);
		wheelState.period = normalizeIndex(targets.period, wheelLabels.periods.length);
		wheelState.hour = normalizeIndex(targets.hour, wheelLabels.hours.length);
		wheelState.minute = normalizeIndex(targets.minute, wheelLabels.minutes.length);
		wheelState.second = normalizeIndex(targets.second, wheelLabels.seconds.length);
		wheelStarted = true;
		drawWheelFrame();
	}

	function activateTab(tabName) {
		dom.tabs.forEach((tab) => {
			const active = tab.dataset.tab === tabName;
			tab.classList.toggle("active", active);
			tab.setAttribute("aria-selected", active ? "true" : "false");
		});

		dom.pages.forEach((page) => {
			page.classList.toggle("active", page.id === tabName);
		});

		if (tabName === "wheel") {
			resizeCanvas();
		}
		if (tabName === "matrix") {
			fitMatrixFont();
		}
	}

	function bindEvents() {
		dom.tabs.forEach((tab) => {
			tab.addEventListener("click", () => {
				activateTab(tab.dataset.tab);
			});
		});

		dom.fullscreen.addEventListener("click", async () => {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
			} else {
				await document.exitFullscreen();
			}
		});

		window.addEventListener("resize", () => {
			resizeCanvas();
			fitMatrixFont();
		});
	}

	function updateOnce() {
		const now = getNow();
		updateTimeView(now);
		updateLunarView(now);
		updateMatrix(now);
	}

	async function start() {
		await ensureLunarLibrary();
		await syncTime();

		createMatrixCells();
		bindEvents();
		resizeCanvas();
		startWheelAnimation();
		fitMatrixFont();
		updateOnce();

		setInterval(updateOnce, 1000);
		setInterval(syncTime, 60 * 60 * 1000);
	}

	start();
})();
