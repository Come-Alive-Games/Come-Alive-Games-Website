// Background scene: a stylized bar-top ledge rendered in the tin's
// yellow / black / white palette, with a subtle silhouette skyline
// behind it so there's some depth without breaking the brand feel.

export function drawScene(ctx, w, h, groundY) {
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#ffcf5c");
  sky.addColorStop(0.6, "#f5a623");
  sky.addColorStop(1, "#e8940f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, groundY + 40);

  // faint radiating "motion" arcs like the tin icon, top-left
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#171512";
  ctx.lineWidth = 10;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(60, 60, 40 + i * 28, Math.PI * 0.9, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.restore();

  // distant silhouette skyline
  ctx.fillStyle = "rgba(23,21,18,0.15)";
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(0, groundY - 40);
  ctx.lineTo(60, groundY - 40);
  ctx.lineTo(60, groundY - 90);
  ctx.lineTo(120, groundY - 90);
  ctx.lineTo(120, groundY - 55);
  ctx.lineTo(200, groundY - 55);
  ctx.lineTo(200, groundY - 110);
  ctx.lineTo(270, groundY - 110);
  ctx.lineTo(270, groundY - 60);
  ctx.lineTo(w, groundY - 60);
  ctx.lineTo(w, groundY);
  ctx.closePath();
  ctx.fill();

  // counter / ledge (the landing surface)
  const counterTop = groundY;
  const counterHeight = h - groundY;
  const wood = ctx.createLinearGradient(0, counterTop, 0, h);
  wood.addColorStop(0, "#4a2f1c");
  wood.addColorStop(0.15, "#3a2414");
  wood.addColorStop(1, "#20130a");
  ctx.fillStyle = wood;
  ctx.fillRect(0, counterTop, w, counterHeight);

  // wood grain lines
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "#171512";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const gy = counterTop + 14 + i * 10;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    for (let x = 0; x <= w; x += 40) {
      ctx.lineTo(x, gy + Math.sin(x * 0.02 + i) * 2);
    }
    ctx.stroke();
  }
  ctx.restore();

  // top highlight edge of the counter
  ctx.fillStyle = "#fdfaf3";
  ctx.fillRect(0, counterTop - 4, w, 4);
  ctx.fillStyle = "#171512";
  ctx.fillRect(0, counterTop, w, 3);
}

export function drawLandingZone(ctx, x, halfWidth, groundY) {
  ctx.save();
  ctx.strokeStyle = "rgba(253,250,243,0.55)";
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - halfWidth, groundY - 2);
  ctx.lineTo(x - halfWidth, groundY + 40);
  ctx.moveTo(x + halfWidth, groundY - 2);
  ctx.lineTo(x + halfWidth, groundY + 40);
  ctx.stroke();
  ctx.restore();
}
