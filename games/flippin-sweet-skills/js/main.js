import { drawPin, PIN_HEIGHT } from "./pin.js";
import { drawScene, drawLandingZone } from "./scene.js";
import { FlipGame, STATE } from "./game.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const GROUND_Y = 430;
const REST_X = W / 2;
const SURFACE_HALF_WIDTH = 230;

const instructionText = document.getElementById("instructionText");
const streakValue = document.getElementById("streakValue");
const bestValue = document.getElementById("bestValue");
const flipsValue = document.getElementById("flipsValue");

const game = new FlipGame({
  groundY: GROUND_Y,
  restX: REST_X,
  surfaceHalfWidth: SURFACE_HALF_WIDTH,
});

const INSTRUCTIONS = {
  [STATE.READY]: "Click / tap to set your angle",
  [STATE.AIM_ANGLE]: "Click again to lock the angle!",
  [STATE.AIM_POWER]: "Click to release the flip!",
  [STATE.FLYING]: "",
  [STATE.RESULT]: "Click / tap to flip again",
};

function updateHud() {
  streakValue.textContent = game.streak;
  bestValue.textContent = game.best;
  flipsValue.textContent = game.flips;
}

function setInstruction(text) {
  instructionText.textContent = text;
}

function handlePointer() {
  const res = game.handleInput();
  if (res.event === "launched") {
    setInstruction("");
  } else if (res.event !== "ignored") {
    setInstruction(INSTRUCTIONS[game.state] ?? "");
  }
}

canvas.addEventListener("click", handlePointer);
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    handlePointer();
  },
  { passive: false }
);

window.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
  e.preventDefault();
  handlePointer();
});

// ---- rendering helpers ----

function drawAngleMeter() {
  const pivotX = REST_X;
  const pivotY = GROUND_Y - PIN_HEIGHT - 31;
  const len = 70;
  const rad = (game.leanDeg * Math.PI) / 180;

  ctx.save();
  ctx.translate(pivotX, pivotY);

  // sweep track (centered on "straight up")
  ctx.strokeStyle = "rgba(23,21,18,0.25)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, len, -Math.PI * 0.5 - 0.85, -Math.PI * 0.5 + 0.85);
  ctx.stroke();

  // arrow — points up and away from the pin, tilted toward whichever side
  // the flip will drift; positive leanDeg (rightward drift) tilts it right
  ctx.rotate(rad);
  ctx.strokeStyle = "#171512";
  ctx.fillStyle = "#c0392b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, -len);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -(len + 14));
  ctx.lineTo(-9, -(len - 4));
  ctx.lineTo(9, -(len - 4));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#171512";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(game.leanDeg)}°`, pivotX, pivotY - len - 20);
  ctx.restore();
}

function drawPowerMeter() {
  const x = REST_X + SURFACE_HALF_WIDTH + 40;
  const topY = GROUND_Y - PIN_HEIGHT - 20;
  const bottomY = GROUND_Y;
  const barW = 26;

  ctx.save();
  ctx.fillStyle = "rgba(23,21,18,0.35)";
  ctx.strokeStyle = "#171512";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x - barW / 2, topY, barW, bottomY - topY, 10);
  ctx.fill();
  ctx.stroke();

  const fillH = (bottomY - topY) * game.power;
  const grad = ctx.createLinearGradient(0, bottomY, 0, topY);
  grad.addColorStop(0, "#2e8b57");
  grad.addColorStop(0.6, "#f5c542");
  grad.addColorStop(1, "#c0392b");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x - barW / 2 + 3, bottomY - fillH, barW - 6, fillH - 3 > 0 ? fillH - 3 : 0, 6);
  ctx.fill();

  ctx.fillStyle = "#171512";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(game.power * 100)}%`, x, topY - 12);
  ctx.restore();
}

function drawResultBanner() {
  if (!game.result) return;
  const { success, message } = game.result;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 34px Arial";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#171512";
  ctx.fillStyle = success ? "#2e8b57" : "#c0392b";
  ctx.strokeText(message, W / 2, 120);
  ctx.fillText(message, W / 2, 120);
  ctx.restore();
}

let lastTime = performance.now();
let prevState = game.state;
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  game.update(dt);

  if (game.state !== prevState) {
    if (game.state === STATE.RESULT) {
      setInstruction(INSTRUCTIONS[STATE.RESULT]);
      updateHud();
    }
    prevState = game.state;
  }

  ctx.clearRect(0, 0, W, H);
  drawScene(ctx, W, H, GROUND_Y);
  drawLandingZone(ctx, REST_X, SURFACE_HALF_WIDTH, GROUND_Y);

  const powerLocked =
    game.state === STATE.AIM_POWER ||
    game.state === STATE.FLYING ||
    game.state === STATE.BOUNCE ||
    game.state === STATE.RESULT;

  if (game.state === STATE.AIM_ANGLE || powerLocked) drawAngleMeter();
  if (powerLocked) drawPowerMeter();

  const tipped = game.state === STATE.RESULT && game.result && !game.result.success;
  drawPin(ctx, game.pinX, game.pinCenterY, game.pinRotation, { tipped });

  if (game.state === STATE.RESULT) drawResultBanner();

  requestAnimationFrame(frame);
}

updateHud();
requestAnimationFrame(frame);
