(function () {
	"use strict";

	const dom = {
		time: document.getElementById("time"),
		solarDate: document.getElementById("solarDate"),
		lunarDate: document.getElementById("lunarDate"),
		ganzhi: document.getElementById("ganzhi"),
		extraInfo: document.getElementById("extraInfo"),
	};

	if (dom.ganzhi) {
		dom.ganzhi.style.display = "none";
	}

	let lunarReady = false;
	let solarFromDate = null;

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

			if (jieqi) extraParts.push(`节气：${jieqi}`);
			if (yiList.length) extraParts.push(`宜：${yiList.slice(0, 3).join("、")}`);
			if (jiList.length) extraParts.push(`忌：${jiList.slice(0, 3).join("、")}`);
			dom.extraInfo.textContent = extraParts.join("  ");
		} catch (error) {
			dom.lunarDate.textContent = "农历信息获取失败";
			dom.ganzhi.textContent = "";
			dom.extraInfo.textContent = "";
			console.warn("农历信息更新失败", error);
		}
	}

	function tick() {
		const now = window.TimeApp.getNow();
		updateTimeView(now);
		updateLunarView(now);
	}

	window.TimeApp.registerPage("clock", {
		start: async function () {
			await ensureLunarLibrary();
			tick();
			setInterval(tick, 1000);
		},
	});
})();
