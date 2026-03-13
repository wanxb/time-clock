(function () {
	"use strict";

	const canvas = document.getElementById("analogCanvas");
	const ctx = canvas.getContext("2d");
	const rootStyle = getComputedStyle(document.documentElement);
	const themeColors = {
		accent: rootStyle.getPropertyValue("--accent").trim() || "#00d4ff",
	};

	let analogStarted = false;

	function resizeCanvas() {
		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;
	}

	function drawDialBase(centerX, centerY, radius) {
		const faceGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.12, centerX, centerY, radius);
		faceGrad.addColorStop(0, "rgba(18, 27, 40, 0.96)");
		faceGrad.addColorStop(1, "rgba(7, 11, 18, 0.96)");
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
		ctx.fillStyle = faceGrad;
		ctx.fill();

		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
		ctx.strokeStyle = "rgba(121, 151, 182, 0.3)";
		ctx.lineWidth = Math.max(2, radius * 0.012);
		ctx.stroke();

		for (let i = 0; i < 60; i += 1) {
			const angle = -Math.PI / 2 + (i * Math.PI * 2) / 60;
			const isMajor = i % 5 === 0;
			const inner = radius * (isMajor ? 0.86 : 0.9);
			const outer = radius * 0.96;
			ctx.beginPath();
			ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
			ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
			ctx.strokeStyle = isMajor ? "rgba(146, 175, 203, 0.7)" : "rgba(126, 154, 181, 0.38)";
			ctx.lineWidth = isMajor ? Math.max(2, radius * 0.01) : Math.max(1, radius * 0.005);
			ctx.stroke();
		}

		ctx.fillStyle = "rgba(180, 206, 231, 0.85)";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `${Math.max(12, radius * 0.115)}px "Segoe UI", "PingFang SC", sans-serif`;
		for (let n = 1; n <= 12; n += 1) {
			const a = -Math.PI / 2 + (n * Math.PI * 2) / 12;
			const tx = centerX + Math.cos(a) * radius * 0.73;
			const ty = centerY + Math.sin(a) * radius * 0.73;
			ctx.fillText(String(n), tx, ty);
		}
	}

	function drawFrame() {
		const now = window.TimeApp.getNow();
		const w = canvas.width;
		const h = canvas.height;
		ctx.clearRect(0, 0, w, h);

		const centerX = w / 2;
		const centerY = h / 2;
		const radius = Math.min(w, h) * 0.42;

		drawDialBase(centerX, centerY, radius);

		const hour = now.getHours() % 12;
		const minute = now.getMinutes();
		const second = now.getSeconds() + now.getMilliseconds() / 1000;
		const minuteFloat = minute + second / 60;
		const hourFloat = hour + minuteFloat / 60;
		const secondFloat = second;

		const hourAngle = -Math.PI / 2 + (hourFloat * Math.PI * 2) / 12;
		const minuteAngle = -Math.PI / 2 + (minuteFloat * Math.PI * 2) / 60;
		const secondAngle = -Math.PI / 2 + (secondFloat * Math.PI * 2) / 60;

		const drawHand = (angle, lengthRatio, widthRatio, color, alpha = 1) => {
			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.lineTo(centerX + Math.cos(angle) * radius * lengthRatio, centerY + Math.sin(angle) * radius * lengthRatio);
			ctx.strokeStyle = color;
			ctx.globalAlpha = alpha;
			ctx.lineWidth = Math.max(2, radius * widthRatio);
			ctx.lineCap = "round";
			ctx.stroke();
			ctx.globalAlpha = 1;
		};

		drawHand(hourAngle, 0.5, 0.028, "rgba(189, 214, 237, 0.95)");
		drawHand(minuteAngle, 0.74, 0.018, "rgba(158, 197, 228, 0.96)");
		drawHand(secondAngle, 0.88, 0.008, themeColors.accent, 0.92);

		ctx.beginPath();
		ctx.arc(centerX, centerY, radius * 0.03, 0, Math.PI * 2);
		ctx.fillStyle = themeColors.accent;
		ctx.fill();

		requestAnimationFrame(drawFrame);
	}

	function startAnimation() {
		if (analogStarted) return;
		analogStarted = true;
		drawFrame();
	}

	window.TimeApp.registerPage("analog", {
		start: function () {
			resizeCanvas();
			startAnimation();
		},
		onResize: function () {
			resizeCanvas();
		},
		onShow: function () {
			resizeCanvas();
		},
	});
})();
