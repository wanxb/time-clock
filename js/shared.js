(function () {
	"use strict";

	const state = {
		offsetMs: 0,
	};

	const dom = {
		tabs: Array.from(document.querySelectorAll(".tab")),
		pages: Array.from(document.querySelectorAll(".page")),
		fullscreen: document.getElementById("fullscreen"),
	};

	const pages = new Map();

	function getNow() {
		return new Date(Date.now() + state.offsetMs);
	}

	async function syncTime() {
		try {
			const response = await fetch("https://worldtimeapi.org/api/ip", { cache: "no-store" });
			const data = await response.json();
			const serverMs = new Date(data.datetime).getTime();
			state.offsetMs = serverMs - Date.now();
		} catch (error) {
			console.info("网络校时失败，使用本地时间", error);
		}
	}

	function activateTab(tabName) {
		dom.tabs.forEach((tab) => {
			const active = tab.dataset.tab === tabName;
			tab.classList.toggle("active", active);
			tab.setAttribute("aria-selected", active ? "true" : "false");
		});

		dom.pages.forEach((page) => {
			const active = page.id === tabName;
			page.classList.toggle("active", active);
			if (active) {
				const module = pages.get(tabName);
				if (module && typeof module.onShow === "function") {
					module.onShow();
				}
			}
		});
	}

	function onResize() {
		pages.forEach((module) => {
			if (typeof module.onResize === "function") {
				module.onResize();
			}
		});
	}

	function bindEvents() {
		dom.tabs.forEach((tab) => {
			tab.addEventListener("click", () => activateTab(tab.dataset.tab));
		});

		dom.fullscreen.addEventListener("click", async () => {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
			} else {
				await document.exitFullscreen();
			}
		});

		window.addEventListener("resize", onResize);
	}

	function registerPage(name, module) {
		pages.set(name, module);
	}

	async function start() {
		bindEvents();
		await syncTime();

		for (const module of pages.values()) {
			if (typeof module.start === "function") {
				await Promise.resolve(module.start());
			}
		}

		onResize();
		setInterval(syncTime, 60 * 60 * 1000);
	}

	window.TimeApp = {
		registerPage,
		activateTab,
		getNow,
		start,
	};
})();
