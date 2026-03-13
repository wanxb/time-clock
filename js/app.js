(function () {
	"use strict";

	function getDefaultTab() {
		const activeTab = document.querySelector(".tab.active");
		return activeTab ? activeTab.dataset.tab : "clock";
	}

	window.addEventListener("DOMContentLoaded", async () => {
		await window.TimeApp.start();
		window.TimeApp.activateTab(getDefaultTab());
	});
})();
