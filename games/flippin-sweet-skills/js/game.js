// Core flip game logic: state machine + physics.
// Kept separate from rendering/input wiring (main.js) and separate from
// the concept of a "surface/platform" so a future stage/level system can
// wrap this in a StageManager without touching the flip physics.

export const STATE = {
  READY: "ready",
  AIM_ANGLE: "aim-angle",
  AIM_POWER: "aim-power",
  FLYING: "flying",
  BOUNCE: "bounce",
  RESULT: "result",
};

const MAX_LEAN_DEG = 42; // how far the angle arrow swings from vertical
const MAX_ROTATIONS = 3.5; // rotations at 100% power
const MAX_DRIFT_PX = 90; // horizontal drift at max lean angle
const MAX_FLIGHT_TIME = 1.15; // seconds, at max power
const MIN_FLIGHT_TIME = 0.45; // seconds, at min power

// Landing odds: always succeeds within the flat zone, then decay
// non-linearly (long tail) out to a hard cutoff where it's never possible.
const LANDING_FLAT_ZONE_DEG = 6;
const LANDING_HARD_CUTOFF_DEG = 40;
const LANDING_DECAY_RATE = 0.12;

// A "lucky catch" (success rolled outside the flat zone) rocks back and
// forth before settling upright instead of easing straight to vertical.
const WOBBLE_FREQUENCY = 2.5;
const WOBBLE_DECAY = 3;

// On any successful land, a small chance to call out an extra-sweet flip.
const FLIPPIN_SWEET_CHANCE = 0.1;

// Rare easter-egg message on a successful land.
const EASTER_EGG_CHANCE = 0.01;

// Very rare easter-egg message on a successful land.
const TOUCH_GRASS_CHANCE = 0.001;

// On a failed (tipped-over) land, a small chance of a fun taunt instead.
const TRY_HARDER_CHANCE = 0.1;
const REALLY_THOUGHT_CHANCE = 0.05;
const AT_FIRST_CHANCE = 0.01;
const NOT_YOUR_SKILL_CHANCE = 0.001;

// A near-perfect upside-down land has a small chance to flip all the way
// around and land upright instead of face-down.
const UPSIDE_DOWN_ZONE_DEG = 6;
const UPSIDE_DOWN_RECOVER_CHANCE = 0.025;

// Half-extents of the pin silhouette, kept in sync with pin.js
const PIN_HALF_HEIGHT = 75;
const PIN_HALF_WIDTH = 37;

// Each bounce after touchdown: [duration seconds, peak height px]
const BOUNCE_PHASES = [
  [0.15, 28],
  [0.13, 20],
  [0.11, 14],
  [0.095, 9],
  [0.08, 6],
  [0.065, 3.5],
  [0.05, 1.8],
  [0.04, 0.8],
];

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// The pin's silhouette isn't a circle, so its vertical extent from its
// center changes as it rotates (upright = tall and narrow, toppled on its
// side = short and wide). This keeps whichever edge is "down" touching the
// ground line instead of the pin hovering or sinking as it rotates.
function groundContactOffset(rotationRad) {
  return (
    PIN_HALF_HEIGHT * Math.abs(Math.cos(rotationRad)) +
    PIN_HALF_WIDTH * Math.abs(Math.sin(rotationRad))
  );
}

// 100% inside the flat zone, 0% past the hard cutoff, exponential decay
// (long tail) in between — a near-miss still has decent odds, a wild miss
// only rarely gets lucky, and nothing beyond the cutoff ever lands.
function landingProbability(uprightErrorDeg) {
  if (uprightErrorDeg <= LANDING_FLAT_ZONE_DEG) return 1;
  if (uprightErrorDeg >= LANDING_HARD_CUTOFF_DEG) return 0;
  return Math.exp(-LANDING_DECAY_RATE * (uprightErrorDeg - LANDING_FLAT_ZONE_DEG));
}

export class FlipGame {
  constructor({ groundY, restX, surfaceHalfWidth }) {
    this.groundY = groundY;
    this.restX = restX;
    this.surfaceHalfWidth = surfaceHalfWidth;

    this.state = STATE.READY;
    this.angleOsc = 0; // -1..1 oscillator phase for angle meter
    this.powerOsc = 0; // 0..1 oscillator phase for power meter
    this.leanDeg = 0;
    this.power = 0;
    this.flight = null; // active flight data while FLYING
    this.result = null; // { success, message }

    this.streak = 0;
    this.best = 0;
    this.flips = 0;

    this._t = 0;
  }

  get pinX() {
    if (this.state === STATE.FLYING || this.state === STATE.BOUNCE) return this.flight.x;
    if (this.state === STATE.RESULT) return this.flight ? this.flight.x : this.restX;
    return this.restX;
  }

  get pinCenterY() {
    if (this.state === STATE.FLYING || this.state === STATE.BOUNCE) return this.flight.y;
    if (this.state === STATE.RESULT && this.flight) return this.flight.y;
    return this.groundY - this._restHalfHeight();
  }

  get pinRotation() {
    if (this.state === STATE.FLYING || this.state === STATE.BOUNCE) return this.flight.rotation;
    if (this.state === STATE.RESULT && this.flight) return this.flight.rotation;
    return 0;
  }

  _restHalfHeight() {
    return PIN_HALF_HEIGHT;
  }

  // Call every frame with dt in seconds.
  update(dt) {
    this._t += dt;

    if (this.state === STATE.AIM_ANGLE) {
      this.angleOsc = Math.sin(this._t * 2.6);
      this.leanDeg = this.angleOsc * MAX_LEAN_DEG;
    } else if (this.state === STATE.AIM_POWER) {
      // 0 -> 1 -> 0 triangle wave, slightly faster than the angle meter
      const period = 1.1;
      const phase = (this._t % period) / period;
      this.powerOsc = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      this.power = this.powerOsc;
    } else if (this.state === STATE.FLYING) {
      this._updateFlight(dt);
    } else if (this.state === STATE.BOUNCE) {
      this._updateBounce(dt);
    }
  }

  // Called on click/tap.
  handleInput() {
    switch (this.state) {
      case STATE.READY:
        this._t = 0;
        this.state = STATE.AIM_ANGLE;
        return { event: "aim-angle-start" };
      case STATE.AIM_ANGLE:
        this._t = 0;
        this.state = STATE.AIM_POWER;
        return { event: "angle-locked", leanDeg: this.leanDeg };
      case STATE.AIM_POWER:
        this._launch();
        return { event: "launched", power: this.power, leanDeg: this.leanDeg };
      case STATE.RESULT:
        this._reset();
        return { event: "reset" };
      default:
        return { event: "ignored" };
    }
  }

  _launch() {
    const power = clamp(this.power, 0.04, 1);
    const flightTime = MIN_FLIGHT_TIME + (MAX_FLIGHT_TIME - MIN_FLIGHT_TIME) * power;
    const rotations = power * MAX_ROTATIONS;
    // Positive leanDeg tilts the arrow (and the pin) toward the right, so
    // the flip should drift the same direction it was aimed.
    const driftX = (this.leanDeg / MAX_LEAN_DEG) * MAX_DRIFT_PX;
    const startRotationRad = (this.leanDeg * Math.PI) / 180;
    const startY = this.groundY - groundContactOffset(startRotationRad);

    this.flight = {
      startX: this.restX,
      endX: this.restX + driftX,
      x: this.restX,
      y: startY,
      peakLift: 90 + power * 170,
      duration: flightTime,
      elapsed: 0,
      rotationStartDeg: this.leanDeg,
      totalRotationDeg: rotations * 360,
      rotation: startRotationRad,
    };
    this.state = STATE.FLYING;
  }

  _updateFlight(dt) {
    const f = this.flight;
    f.elapsed += dt;
    const t = clamp(f.elapsed / f.duration, 0, 1);

    // parabolic arc for height, linear for horizontal drift
    const arc = 4 * t * (1 - t); // 0..1..0
    f.x = f.startX + (f.endX - f.startX) * t;

    const currentRotationDeg = f.rotationStartDeg + f.totalRotationDeg * t;
    f.rotation = (currentRotationDeg * Math.PI) / 180;

    const baseline = this.groundY - groundContactOffset(f.rotation);
    f.y = baseline - arc * f.peakLift;

    if (t >= 1) {
      this._land(currentRotationDeg, f.x);
    }
  }

  _land(finalRotationDeg, finalX) {
    const normalized = ((finalRotationDeg % 360) + 360) % 360;
    const uprightError = Math.min(normalized, 360 - normalized);
    const withinSurface = Math.abs(finalX - this.restX) <= this.surfaceHalfWidth;
    const probability = landingProbability(uprightError);
    let success = withinSurface && Math.random() < probability;

    const upsideDownError = Math.abs(normalized - 180);
    if (
      !success &&
      withinSurface &&
      upsideDownError <= UPSIDE_DOWN_ZONE_DEG &&
      Math.random() < UPSIDE_DOWN_RECOVER_CHANCE
    ) {
      success = true;
    }

    const isLuckyCatch = success && uprightError > LANDING_FLAT_ZONE_DEG;

    this.flips += 1;
    if (success) {
      this.streak += 1;
      this.best = Math.max(this.best, this.streak);
    } else {
      this.streak = 0;
    }

    let message;
    if (!withinSurface) {
      message = "Off the edge!";
    } else if (success) {
      message = isLuckyCatch ? "Lucky catch!" : "Perfect landing!";
      if (Math.random() < FLIPPIN_SWEET_CHANCE) message = "Flippin' Sweet!";
      if (Math.random() < EASTER_EGG_CHANCE) message = "Definitely a 404 Error ;)";
      if (Math.random() < TOUCH_GRASS_CHANCE) message = "Go touch some grass";
    } else {
      message = "Tipped over!";
      if (Math.random() < TRY_HARDER_CHANCE) message = "You can do better";
      if (Math.random() < REALLY_THOUGHT_CHANCE) message = "You really thought that would work?";
      if (Math.random() < AT_FIRST_CHANCE) message = "If at first you don't succeed...";
      if (Math.random() < NOT_YOUR_SKILL_CHANCE) message = "Maybe this isn't your skill";
    }

    // Snap target rotation: successful lands settle upright (nearest full
    // turn); failed lands settle toppled onto their side (nearest quarter
    // turn away from upright), so the miss reads clearly as a tip-over.
    const spinDir = Math.sign(this.flight.totalRotationDeg) || 1;
    let targetDeg;
    if (success) {
      targetDeg = Math.round(finalRotationDeg / 360) * 360;
    } else {
      targetDeg = Math.round(finalRotationDeg / 90) * 90;
      const targetNormalized = ((targetDeg % 360) + 360) % 360;
      if (targetNormalized === 0 || targetNormalized === 180) {
        targetDeg += 90 * spinDir;
      }
    }

    this.flight.rotation = (finalRotationDeg * Math.PI) / 180;
    this.result = { success, message, uprightError, withinSurface, isLuckyCatch };

    this.bounce = {
      x: finalX,
      rotStartDeg: finalRotationDeg,
      rotEndDeg: targetDeg,
      isLuckyCatch,
      // Clamp: the upside-down recovery can produce a ~180deg uprightError,
      // far past what this wobble was tuned for.
      wobbleAmplitude: Math.min(uprightError, LANDING_HARD_CUTOFF_DEG),
      phaseIndex: 0,
      phaseElapsed: 0,
    };
    this.state = STATE.BOUNCE;
    this._t = 0;
  }

  _updateBounce(dt) {
    const b = this.bounce;
    const phases = BOUNCE_PHASES;
    b.phaseElapsed += dt;

    const [duration, peakHeight] = phases[b.phaseIndex];
    const t = clamp(b.phaseElapsed / duration, 0, 1);

    // overall progress across all bounce phases, for rotation easing
    const totalDuration = phases.reduce((sum, p) => sum + p[0], 0);
    const elapsedBefore = phases.slice(0, b.phaseIndex).reduce((sum, p) => sum + p[0], 0);
    const overallT = clamp((elapsedBefore + b.phaseElapsed) / totalDuration, 0, 1);
    const eased = 1 - Math.pow(1 - overallT, 2);
    let rotationDeg = b.rotStartDeg + (b.rotEndDeg - b.rotStartDeg) * eased;
    if (b.isLuckyCatch) {
      const wobble =
        b.wobbleAmplitude *
        Math.exp(-WOBBLE_DECAY * overallT) *
        Math.sin(overallT * WOBBLE_FREQUENCY * 2 * Math.PI);
      rotationDeg += wobble;
    }
    const rotationRad = (rotationDeg * Math.PI) / 180;

    const arc = 4 * t * (1 - t);
    const baseline = this.groundY - groundContactOffset(rotationRad);
    this.flight.x = b.x;
    this.flight.y = baseline - arc * peakHeight;
    this.flight.rotation = rotationRad;

    if (t >= 1) {
      b.phaseIndex += 1;
      b.phaseElapsed = 0;
      if (b.phaseIndex >= phases.length) {
        const finalRotationRad = (b.rotEndDeg * Math.PI) / 180;
        this.flight.rotation = finalRotationRad;
        this.flight.y = this.groundY - groundContactOffset(finalRotationRad);
        this.state = STATE.RESULT;
        this._t = 0;
      }
    }
  }

  _reset() {
    this.state = STATE.READY;
    this.flight = null;
    this.result = null;
    this.leanDeg = 0;
    this.power = 0;
    this._t = 0;
  }
}
