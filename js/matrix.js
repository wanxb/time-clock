(function () {
	"use strict";

	const CN_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
	const MATRIX_FIXED_FONT_SIZE = 46;

	function toChineseNumber(num) {
		if (num < 10) return CN_DIGITS[num];
		if (num < 20) return num === 10 ? "十" : `十${CN_DIGITS[num % 10]}`;
		const tens = Math.floor(num / 10);
		const ones = num % 10;
		return `${CN_DIGITS[tens]}十${ones ? CN_DIGITS[ones] : ""}`;
	}

	const labels = {
		months: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
		days: Array.from({ length: 31 }, (_, i) => `${toChineseNumber(i + 1)}号`),
		weeks: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
		hours: Array.from({ length: 24 }, (_, i) => `${toChineseNumber(i)}点`),
		minutes: Array.from({ length: 60 }, (_, i) => `${toChineseNumber(i)}分`),
		seconds: Array.from({ length: 60 }, (_, i) => `${toChineseNumber(i)}秒`),
	};

	const container = document.getElementById("matrixContainer");

	function createCells() {
		container.innerHTML = "";
		const groups = [
			["month", labels.months],
			["day", labels.days],
			["week", labels.weeks],
			["hour", labels.hours],
			["minute", labels.minutes],
			["second", labels.seconds],
		];

		groups.forEach(([group, list]) => {
			list.forEach((text, index) => {
				const span = document.createElement("span");
				span.className = "matrixCell";
				span.textContent = text;
				span.dataset.group = group;
				span.dataset.index = String(index);
				container.appendChild(span);
			});
		});
	}

	function highlightGroup(group, index) {
		const cells = document.querySelectorAll(`[data-group="${group}"]`);
		cells.forEach((cell, cellIndex) => {
			cell.classList.toggle("active", cellIndex === index);
		});
	}

	function tick() {
		const now = window.TimeApp.getNow();
		highlightGroup("month", now.getMonth());
		highlightGroup("day", now.getDate() - 1);
		highlightGroup("week", now.getDay());
		highlightGroup("hour", now.getHours());
		highlightGroup("minute", now.getMinutes());
		highlightGroup("second", now.getSeconds());
	}

	window.TimeApp.registerPage("matrix", {
		start: function () {
			createCells();
			tick();
			setInterval(tick, 1000);
		},
		onResize: function () {
			container.style.setProperty("--matrix-font-size", `${MATRIX_FIXED_FONT_SIZE}px`);
		},
		onShow: function () {
			tick();
		},
	});
})();
