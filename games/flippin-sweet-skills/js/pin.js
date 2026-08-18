// Draws the "Skill" (the pin/bottle shape lifted from the tin artwork).
// Local origin (0,0) is the vertical CENTER of the pin so it can be
// rotated naturally around its center of mass while airborne.

export const PIN_HEIGHT = 150;
export const PIN_WIDTH = 74;

function pinPath(ctx) {
  const h = PIN_HEIGHT;
  const halfH = h / 2;
  const maxHalfW = PIN_WIDTH / 2; // widest point of the body AND the flat-bottom width

  ctx.beginPath();
  // top of head (rounded)
  ctx.moveTo(-9, -halfH);
  ctx.bezierCurveTo(-9, -halfH - 14, 9, -halfH - 14, 9, -halfH);
  // right side of head down to neck
  ctx.bezierCurveTo(15, -halfH + 12, 15, -halfH + 22, 9, -halfH + 32);
  // neck taper
  ctx.lineTo(10, -halfH + 42);
  // shoulder flare out to the widest point of the body
  ctx.bezierCurveTo(20, -halfH + 56, maxHalfW, -halfH + 66, maxHalfW, -halfH + 82);
  // body straight down to the flat bottom (same width as the widest point)
  ctx.lineTo(maxHalfW, halfH);
  // flat bottom
  ctx.lineTo(-maxHalfW, halfH);
  // body straight back up
  ctx.lineTo(-maxHalfW, -halfH + 82);
  // left shoulder flare
  ctx.bezierCurveTo(-maxHalfW, -halfH + 66, -20, -halfH + 56, -10, -halfH + 42);
  // left neck taper
  ctx.lineTo(-9, -halfH + 32);
  // left side of head up
  ctx.bezierCurveTo(-15, -halfH + 22, -15, -halfH + 12, -9, -halfH);
  ctx.closePath();
}

export function drawPin(ctx, x, y, rotationRad, opts = {}) {
  const { tipped = false } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotationRad);

  // soft body fill
  pinPath(ctx);
  const grad = ctx.createLinearGradient(-PIN_WIDTH / 2, 0, PIN_WIDTH / 2, 0);
  grad.addColorStop(0, "#e9e4d6");
  grad.addColorStop(0.45, "#fdfaf3");
  grad.addColorStop(1, "#d8d2c0");
  ctx.fillStyle = tipped ? "#c9c3b3" : grad;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#171512";
  ctx.stroke();

  // clip to pin silhouette for the stripe bands
  ctx.save();
  pinPath(ctx);
  ctx.clip();

  const halfH = PIN_HEIGHT / 2;
  ctx.fillStyle = "#171512";
  ctx.fillRect(-40, halfH - 46, 80, 7);
  ctx.fillRect(-40, halfH - 32, 80, 7);
  ctx.restore();

  ctx.restore();
}
