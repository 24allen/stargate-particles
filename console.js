"use strict";

const byId = id => document.getElementById(id);
const modes = [
  { id: "NEBULA", name: "粒子核心", en: "PARTICLE CORE", hand: "张手展开，握拳收束",
    hint: "张手展开，握拳收束，快速挥手留下尾迹。",
    icon: '<circle cx="24" cy="19" r="14"/><circle cx="24" cy="19" r="6"/><path d="M24 1v5m0 26v5M6 19h5m26 0h5"/>' },
  { id: "COLLAPSE", name: "引力视界", en: "EVENT HORIZON", hand: "按 2 切换",
    hint: "吸积盘与光子环沿相反方向转动。",
    icon: '<circle cx="24" cy="19" r="12"/><circle cx="24" cy="19" r="5"/><path d="M24 2v8m0 18v8M7 19h8m18 0h8m-19-2 4 4m0-4-4 4"/>' },
  { id: "DNA", name: "双螺旋", en: "DOUBLE HELIX", hand: "比 1 · 只伸食指",
    hint: "只伸食指，中指、无名指和小指弯曲，拇指自然放松。",
    icon: '<path d="M14 3c0 10 20 22 20 32M34 3c0 10-20 22-20 32M15 6h18m-14 6h10m-10 14h10m-14 6h18"/>' },
  { id: "WORMHOLE", name: "虫洞跃迁", en: "WORMHOLE", hand: "比出 V 字",
    hint: "比出 V 字，粒子会聚成有纵深的隧道。",
    icon: '<ellipse cx="22" cy="19" rx="16" ry="13"/><ellipse cx="24" cy="19" rx="11" ry="9"/><ellipse cx="27" cy="19" rx="6" ry="5"/><path d="m22 6 5 8m-5 18 5-8M6 19h15m17 0h5"/>' },
  { id: "LOCK", name: "目标锁定", en: "TARGET LOCK", hand: "拇指与食指张成 L",
    hint: "拇指与食指张成 L，阵列跟随食指指尖。",
    icon: '<path d="M7 13V6h9m16 0h9v7m0 12v7h-9m-16 0H7v-7m13-6h8m-4-4v8"/><circle cx="24" cy="19" r="9"/>' }
];
const modeButtons = modes.map((preset, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mode";
  button.title = preset.hand;
  button.innerHTML = `<svg viewBox="0 0 48 38" aria-hidden="true">${preset.icon}</svg>
    <strong>${preset.name}</strong>`;
  button.addEventListener("click", () => selectMode(index));
  byId("modes").append(button);
  return button;
});

const TAU = Math.PI * 2;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const field = byId("field");
const ctx = field.getContext("2d", { alpha: false });
const portrait = matchMedia("(max-width: 650px)");
const count = portrait.matches ? 6500 : 14000;
const number = new Intl.NumberFormat("zh-CN");
const points = [];
const stars = [];
const palettes = [
  ["#427ce8", "#559dff", "#8fcfff", "#e7f6ff", "#ffefcf", "#ffc48e"],
  ["#6a3441", "#ad5945", "#e1814c", "#ffc184", "#fff1cb", "#fff9eb"],
  ["#254f8b", "#3d9bcc", "#5ad4ec", "#b8f8ff", "#faf4ff", "#a58eff"],
  ["#4c41a1", "#7168dd", "#739df9", "#c4ddff", "#e8f1ff", "#c0a3ff"],
  ["#2f5c71", "#4c94ae", "#6ad5ed", "#bef8ff", "#e3ffff", "#6db9ff"]
];
const paletteRGB = palettes.map(palette => palette.map(colour =>
  colour.slice(1).match(/../g).map(channel => parseInt(channel, 16))));
const currentPalette = paletteRGB[0].map(colour => [...colour]);
const glowSprites = new Map();
let mode = -1, width = 0, height = 0, pixelRatio = 1;
let zoom = 1, targetZoom = 1, yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0;
let offsetX = 0, offsetY = 0, targetX = 0, targetY = 0;
let time = 0, transition = 0, lastFrame = 0, drag = null;
let pulse = null;
let aperture = .32, handAperture = null, mouseRelease = 0;
let wake = null, lastPalm = null, stableGesture = "NONE";
let dustTexture;

// Seed the field so every reload starts from the same star chart.
let seed = 18452;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function bell() {
  return random() + random() + random() + random() - 2;
}
for (let i = 0; i < 650; i++) {
  stars.push({ x: random(), y: random(), size: .35 + Math.pow(random(), 7) * 1.5, light: .15 + random() * .66, colour: random() < .14 ? "#f8d9b3" : "#b4cfff" });
}
for (let i = 0; i < count; i++) {
  const a = random() * TAU;
  const photonRing = i % 5 === 0;
  const orbit = photonRing ? .35 + bell() * .018 : .39 + Math.pow(random(), 2.3) * .91;
  const ringX = orbit * Math.cos(a);
  const ringY = orbit * Math.sin(a);
  const strand = i % 2 * Math.PI;
  const rung = i % 9 === 0;
  const dnaY = rung ? Math.round(random() * 19) / 19 * 2 - 1 : random() * 2 - 1;
  const dnaAngle = dnaY * 6.3 + strand;
  const dnaRadius = rung ? random() * .43 : .46 + bell() * .057;
  const depth = (i % 9) / 9 + random() * .04;
  const tunnelRadius = .25 + Math.pow(1 - depth, 1.3) * .98 + bell() * .043;
  const lockRadius = [.67, .8, 1.01][i % 3] + bell() * .025;
  const lockAngle = i % 4 * TAU / 4 + random() * 1.23;
  const latitude = random() * 2 - 1;
  const shell = Math.sqrt(1 - latitude * latitude);
  const orbitPhase = random() * TAU;
  points.push({
    positions: [
      null,
      photonRing ? [ringX, ringY, 0] : [ringX, ringY * .23 - ringX * .18 + bell() * .028, ringY * .65],
      [Math.cos(dnaAngle) * dnaRadius, dnaY * .99 + bell() * .018, Math.sin(dnaAngle) * dnaRadius],
      [Math.cos(a) * tunnelRadius + depth * .36, Math.sin(a) * tunnelRadius - depth * .13, -depth * 1.85],
      [Math.cos(lockAngle) * lockRadius, Math.sin(lockAngle) * lockRadius, bell() * .04]
    ],
    x: shell * Math.cos(orbitPhase) * .45, y: latitude * .45, z: shell * Math.sin(orbitPhase) * .45,
    photonRing,
    core: [shell * Math.cos(orbitPhase), latitude, shell * Math.sin(orbitPhase)],
    seed: random(),
    phase: orbitPhase,
    nucleus: i % 4 === 0,
    size: random() < .075 ? 1.35 + random() * .65 : .43 + random() * .81,
    light: .24 + random() * .68,
    colour: i % 17 < 3 ? 3 + i % 3 : i % 9 === 0 ? 5 : i % 4
  });
}
byId("particles").textContent = number.format(count);

function emitPulse(x = .5 + offsetX, y = (portrait.matches ? .48 : .47) + offsetY, strength = 1) {
  pulse = { x, y, strength, start: performance.now() };
  if (mode === 0) mouseRelease = pulse.start + 900;
}
function emitWake(x, y, dx, dy) {
  const length = Math.hypot(dx, dy);
  wake = { x, y, dx: dx / length, dy: dy / length, start: performance.now() };
}
byId("pulse").addEventListener("click", () => emitPulse());

function selectMode(index) {
  if (index === mode) return;
  const preset = modes[index];
  mode = index;
  transition = reducedMotion.matches ? 0 : 1;
  byId("fieldIndex").textContent = String(index + 1).padStart(2, "0");
  byId("modeName").textContent = preset.name;
  byId("modeEnglish").textContent = preset.en;
  byId("modeHint").textContent = preset.hint;
  byId("spreadStatus").hidden = mode !== 0;
  modeButtons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
}

function resize() {
  width = field.clientWidth;
  height = field.clientHeight;
  pixelRatio = Math.min(devicePixelRatio || 1, 1.65);
  field.width = Math.round(width * pixelRatio);
  field.height = Math.round(height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  dustTexture = document.createElement("canvas");
  dustTexture.width = width;
  dustTexture.height = height;
  const bg = dustTexture.getContext("2d");
  bg.fillStyle = "#030710";
  bg.fillRect(0, 0, width, height);
  haze(bg, width * .50, height * .47, Math.max(width * .48, height * .69), [10, 29, 62], .63);
  for (const star of stars) {
    bg.globalAlpha = star.light * .29;
    bg.fillStyle = star.colour;
    bg.fillRect(star.x * width, star.y * height, star.size, star.size);
  }
  bg.globalAlpha = 1;
}
function haze(context, x, y, radius, rgb, opacity) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(${rgb}, ${opacity})`);
  gradient.addColorStop(.26, `rgba(${rgb}, ${opacity * .61})`);
  gradient.addColorStop(.61, `rgba(${rgb}, ${opacity * .14})`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

const orbitArcs = [
  { r: .86, start: .05, end: 5.8, colour: "#41608064" },
  { r: 1.13, start: .18, end: 3.12, colour: "#5e88af91" },
  { r: 1.23, start: 2.97, end: 5.67, colour: "#557fa585" },
  { r: 1.41, start: .15, end: 6.0, colour: "#46678989" },
  { r: 1.49, start: 3.64, end: 5.26, colour: "#c9e8ff9a" }
];
function drawGuides(cx, cy, size) {
  const r = size * (mode === 4 ? 1.11 : 1.52);
  const flat = mode === 2 ? .73 : .88;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = .7;
  ctx.globalAlpha = .66;
  for (const arc of orbitArcs) {
    ctx.strokeStyle = arc.colour;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * arc.r / 1.52, r * flat * arc.r / 1.52, 0, arc.start, arc.end);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.strokeStyle = "#789fc985";
  for (let i = 0; i < 96; i++) {
    const a = i / 96 * TAU;
    const x = Math.cos(a), y = Math.sin(a) * flat;
    const tick = i % 8 === 0 ? 7 : 3;
    ctx.moveTo(x * r, y * r);
    ctx.lineTo(x * (r + tick), y * (r + tick));
  }
  ctx.stroke();
  if (mode === 4) {
    const angle = time * .92;
    ctx.strokeStyle = "#8ce7ff96";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * flat, 0, angle - .17, angle + .17);
    ctx.stroke();
    ctx.fillStyle = "#e3f9ff";
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r * flat, 2.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
function drawLock(cx, cy, radius) {
  const bracket = radius * .65;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "#84e3ffb0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      ctx.moveTo(x * bracket, y * bracket * .72);
      ctx.lineTo(x * bracket, y * bracket);
      ctx.lineTo(x * bracket * .72, y * bracket);
    }
  }
  ctx.moveTo(-9, 0);
  ctx.lineTo(9, 0);
  ctx.moveTo(0, -9);
  ctx.lineTo(0, 9);
  ctx.stroke();
  ctx.restore();
}

function glowSprite(colour) {
  if (!glowSprites.has(colour)) {
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 16;
    const paint = sprite.getContext("2d");
    const glow = paint.createRadialGradient(8, 8, 0, 8, 8, 8);
    glow.addColorStop(0, colour);
    glow.addColorStop(.24, colour + "82");
    glow.addColorStop(1, colour + "00");
    paint.fillStyle = glow;
    paint.fillRect(0, 0, 16, 16);
    glowSprites.set(colour, sprite);
  }
  return glowSprites.get(colour);
}

const coreColours = ["#156dc4", "#28acfa", "#41d5ff", "#b3f3ff"];

function drawCore(now, dt, calm, cx, cy) {
  const idle = .34 + Math.sin(time * 1.47) * .27;
  const wanted = drag ? .015 : handAperture ?? (now < mouseRelease ? .95 : idle);
  const response = wanted > aperture ? 8 : 10;
  aperture += (wanted - aperture) * (1 - Math.exp(-dt * response));
  const percent = Math.round(aperture * 100);
  const meter = byId("spread");
  if (meter.value !== percent) {
    meter.value = percent;
    byId("spreadValue").textContent = percent + "%";
  }

  const scale = Math.min(width * .33, height * .29) * zoom;
  const rotation = time * .38 + yaw;
  const co = Math.cos(rotation), si = Math.sin(rotation);
  const ct = Math.cos(pitch + .2), st = Math.sin(pitch + .2);
  const coreGlow = .49 + .08 * Math.sin(time * 3);
  const burstAge = pulse ? (now - pulse.start) / 1000 : Infinity;
  const wakeAge = wake ? (now - wake.start) / 1000 : Infinity;
  if (burstAge > 1.05) pulse = null;
  if (wakeAge > 1.15) wake = null;
  const sprite = glowSprite("#3cbbff");
  const wave = burstAge * Math.max(width, height) * .58;
  const wakePower = wake ? (1 - wakeAge / 1.15) ** 2 : 0;
  const wakeX = wake ? (wake.x + wake.dx * wakeAge * .32) * width : 0;
  const wakeY = wake ? (wake.y + wake.dy * wakeAge * .32) * height : 0;
  const scatter = calm ? .55 : 1;

  haze(ctx, cx, cy, scale * (1.3 + aperture * .7), [5, 86, 174], .32);
  haze(ctx, cx, cy, scale * (.68 - aperture * .15), [17, 147, 237], .39);
  ctx.globalCompositeOperation = "lighter";
  for (const p of points) {
    const [px, py, pz] = p.core;
    const shell = p.nucleus
      ? (.27 + p.seed * .38) * (1 - aperture * .32)
      : .39 + p.seed * .31 + aperture * (1.48 + p.seed * .71) * scatter;
    const shimmer = Math.sin(p.phase + time * 2.4 + py * 5);
    const r = shell * (1 + .037 * shimmer);
    const x = px * co - pz * si;
    const z = pz * co + px * si;
    const depth = (z * ct - py * st) * r;
    const perspective = 3.8 / (3.8 - depth * .83);
    const y = py * ct + z * st;
    let sx = cx + x * r * scale * perspective;
    let sy = cy + y * r * scale * perspective;
    let gain = 0;
    if (pulse && !p.nucleus) {
      const dx = sx - pulse.x * width, dy = sy - pulse.y * height;
      const length = Math.max(1, Math.hypot(dx, dy));
      const band = Math.max(0, 1 - Math.abs(length - wave) / (scale * .82));
      gain = band * band * (1 - burstAge / 1.05);
      sx += dx / length * gain * scale * .77 * scatter;
      sy += dy / length * gain * scale * .77 * scatter;
    }
    if (wake && !p.nucleus) {
      const distance = Math.hypot(sx - wakeX, sy - wakeY);
      const pull = Math.max(0, 1 - distance / (scale * 1.62)) * wakePower;
      sx += wake.dx * pull * scale * 1.35 * scatter;
      sy += wake.dy * pull * scale * 1.35 * scatter;
      gain += pull * 1.4;
    }
    const size = Math.min(3, (.49 + p.seed * .77 + gain * .4) * perspective);
    ctx.globalAlpha = clamp((p.nucleus ? .24 : .35) + p.light * .44 + shimmer * .085 + gain, .12, .88);
    ctx.fillStyle = coreColours[p.nucleus ? (p.seed > .91 ? 3 : 2) : Math.floor(p.seed * 3)];
    ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
    if ((p.seed > .993 || gain > .29 && p.seed > .90) && !p.nucleus) {
      const glow = size * (4.6 + gain * 3);
      ctx.drawImage(sprite, sx - glow / 2, sy - glow / 2, glow, glow);
    }
  }
  ctx.globalAlpha = 1;
  haze(ctx, cx, cy, scale * (.35 - aperture * .09), [30, 177, 245], coreGlow);
  ctx.globalCompositeOperation = "source-over";
}

function drawField(now) {
  const dt = Math.min((now - (lastFrame || now)) / 1000, .075);
  lastFrame = now;
  const calm = reducedMotion.matches;
  time += dt * (calm ? .28 : 1);
  const ease = calm ? 1 : 1 - Math.exp(-dt * 8);
  yaw += (targetYaw - yaw) * ease;
  pitch += (targetPitch - pitch) * ease;
  zoom += (targetZoom - zoom) * ease;
  offsetX += (targetX - offsetX) * ease;
  offsetY += (targetY - offsetY) * ease;
  transition = Math.max(0, transition - dt * 1.55);

  const cx = width * .50 + offsetX * width;
  const cy = height * (portrait.matches ? .48 : .47) + offsetY * height;
  ctx.drawImage(dustTexture, 0, 0);
  const readout = zoom.toFixed(2) + "×";
  if (byId("zoomValue").textContent !== readout) byId("zoomValue").textContent = readout;
  if (mode === 0) {
    drawCore(now, dt, calm, cx, cy);
    return;
  }
  const radius = Math.min(width * .305, height * (mode === 2 ? .33 : .42)) * zoom;
  const angle = yaw + (mode === 2 ? time * .92 : 0);
  const co = Math.cos(angle), si = Math.sin(angle);
  const tilt = pitch + .07;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const twist = mode === 3 ? time * .65 : mode === 4 ? time * -.28 : 0;
  const cr = Math.cos(twist), sr = Math.sin(twist);
  drawGuides(cx, cy, radius);
  if (mode === 1 || mode === 3) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(twist);
    ctx.scale(1, mode < 2 ? .50 : 1);
    haze(ctx, 0, 0, radius * 1.34, paletteRGB[mode][0], .39);
    ctx.restore();
  }
  const colours = currentPalette.map((colour, i) => {
    for (let c = 0; c < 3; c++) colour[c] += (paletteRGB[mode][i][c] - colour[c]) * ease;
    return `rgb(${colour.map(Math.round).join(",")})`;
  });
  const sprites = palettes[mode].map(glowSprite);
  const pulseAge = pulse ? Math.max(0, now - pulse.start) / 1000 : 0;
  if (pulseAge > .95) pulse = null;
  const wave = calm ? 0 : pulseAge * Math.hypot(width, height) * 1.1;
  const travel = 1 - Math.exp(-dt * 7.5);
  const discCos = Math.cos(time * 1.12), discSin = Math.sin(time * 1.12);
  const ringCos = Math.cos(-time * 1.56), ringSin = Math.sin(-time * 1.56);
  ctx.globalCompositeOperation = "lighter";
  for (const p of points) {
    let [tx, ty, tz] = p.positions[mode];
    if (mode === 1) {
      // Keep the photon ring and accretion disc in their respective planes.
      const x = tx;
      if (p.photonRing) {
        tx = x * ringCos - ty * ringSin;
        ty = ty * ringCos + x * ringSin;
      } else {
        const discY = tz / .65;
        const thickness = ty - discY * .23 + x * .18;
        tx = x * discCos - discY * discSin;
        const rotatedY = discY * discCos + x * discSin;
        ty = rotatedY * .23 - tx * .18 + thickness;
        tz = rotatedY * .65;
      }
    } else if (mode === 3) {
      const swell = 1 + Math.sin(time * 4 + tz * 5) * .085;
      tx *= swell;
      ty *= swell;
    }
    if (calm || !transition) {
      p.x = tx; p.y = ty; p.z = tz;
    } else {
      p.x += (tx - p.x) * travel;
      p.y += (ty - p.y) * travel;
      p.z += (tz - p.z) * travel;
    }
    const x = p.x * co - p.z * si;
    const z = p.z * co + p.x * si;
    const y = p.y * ct + z * st;
    const depth = z * ct - p.y * st;
    const perspective = 3.9 / (3.9 - depth);
    let sx = cx + (x * cr - y * sr) * radius * perspective;
    let sy = cy + (x * sr + y * cr) * radius * perspective;
    let impulse = 0;
    if (pulse) {
      const dx = sx - pulse.x * width, dy = sy - pulse.y * height;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const band = Math.max(0, 1 - Math.abs(distance - wave) / (radius * (calm ? 1.4 : .39)));
      impulse = band * band * (1 - pulseAge / .95) * pulse.strength;
      if (!calm) {
        sx += dx / distance * impulse * radius * .17;
        sy += dy / distance * impulse * radius * .17;
      }
    }
    const size = p.size * perspective * (portrait.matches ? .78 : 1);
    ctx.globalAlpha = clamp(p.light * (.65 + depth * .24) + impulse * .47, 0, 1);
    ctx.fillStyle = colours[p.colour];
    ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
    if (p.size > 1.3) {
      const glow = size * (5 + impulse * 3);
      ctx.drawImage(sprites[p.colour], sx - glow / 2, sy - glow / 2, glow, glow);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  if (mode === 4) drawLock(cx, cy, radius);
  if (transition > 0) {
    ctx.strokeStyle = `rgba(150, 220, 255, ${transition * .37})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * (2.04 - transition), radius * (1.28 - transition * .65), twist, 0, TAU);
    ctx.stroke();
  }
}

function zoomBy(factor) {
  targetZoom = clamp(targetZoom * factor, .55, 2.65);
}
byId("zoomIn").addEventListener("click", () => zoomBy(1.18));
byId("zoomOut").addEventListener("click", () => zoomBy(1 / 1.18));
byId("resetView").addEventListener("click", () => {
  targetZoom = 1;
  targetPitch = targetYaw = targetX = targetY = 0;
});
field.addEventListener("wheel", event => {
  event.preventDefault();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
  zoomBy(Math.exp(clamp(-delta * .0014, -.26, .26)));
}, { passive: false });
field.addEventListener("pointerdown", event => {
  if (drag || event.button !== 0) return;
  field.setPointerCapture(event.pointerId);
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, start: performance.now(), travel: 0 };
});
field.addEventListener("pointermove", event => {
  if (drag?.id !== event.pointerId) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  drag.travel += Math.hypot(dx, dy);
  if (drag.travel > 5) {
    targetYaw += dx * .008;
    targetPitch = clamp(targetPitch + dy * .005, -.7, .9);
  }
  drag.x = event.clientX;
  drag.y = event.clientY;
});
field.addEventListener("pointerup", event => {
  if (drag?.id !== event.pointerId || (mode !== 0 && drag.travel > 5)) return;
  const bounds = field.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / width, y = (event.clientY - bounds.top) / height;
  const dx = (event.clientX - drag.startX) / width, dy = (event.clientY - drag.startY) / height;
  if (mode === 0 && performance.now() - drag.start < 600 && Math.hypot(dx, dy) > .13) emitWake(x, y, dx, dy);
  else if (mode === 0 && performance.now() - drag.start > 200) emitPulse();
  else emitPulse(x, y);
});
field.addEventListener("lostpointercapture", event => {
  if (drag?.id === event.pointerId) drag = null;
});
document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  if (/^[1-5]$/.test(event.key)) selectMode(Number(event.key) - 1);
  if (event.code === "Space" && event.target === document.body) {
    event.preventDefault();
    emitPulse();
  }
});
const fullscreen = byId("fullscreen");
fullscreen.hidden = !document.fullscreenEnabled;
fullscreen.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    fullscreen.title = "当前浏览器无法切换全屏";
  }
});
document.addEventListener("fullscreenchange", () => {
  const label = document.fullscreenElement ? "退出全屏" : "全屏";
  fullscreen.title = label;
  fullscreen.setAttribute("aria-label", label);
});

const visionBase = new URL("vendor/mediapipe/", document.baseURI);
const handModel = new URL("hand_landmarker.task", visionBase).href;
const cameraToggle = byId("cameraToggle");
const cameraFeed = byId("cameraFeed");
const cameraContext = cameraFeed.getContext("2d");
const connections = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
];
let video = null, stream = null, tracker = null, connecting = false, cameraRun = 0;
let landmarks = null, lastVideoTime = -1, lastDetection = 0, lastSeen = 0;
let candidate = "NONE", candidateSince = 0, pinchStart = 0, pinchZoom = 1;
const gestureLabels = {
  NEBULA: "张掌", COLLAPSE: "握拳", DNA: "食指 · 双螺旋",
  WORMHOLE: "V 字 · 虫洞", LOCK: "L 形 · 锁定", PINCH: "捏合 · 缩放"
};

function setCameraState(state, hint, button) {
  byId("camState").textContent = state;
  byId("camHint").textContent = hint;
  byId("camHint").toggleAttribute("data-idle", state === "待连接");
  cameraToggle.querySelector("span").textContent = button;
}
function showHand(active) {
  const countLabel = active ? "01 / 01" : "00 / 01";
  const count = byId("handCount");
  if (count.textContent !== countLabel) {
    count.textContent = countLabel;
    byId("inputStatus").lastChild.textContent = active ? " 手势接管" : " 手动控制";
  }
  if (!tracker) return;
  const state = active ? (gestureLabels[stableGesture] ?? "正在辨认") : "等待手掌";
  const status = byId("camState");
  if (status.textContent !== state) status.textContent = state;
}
function disconnectCamera() {
  cameraRun++;
  connecting = false;
  const oldStream = stream;
  stream = null;
  oldStream?.getTracks().forEach(track => track.stop());
  tracker?.close();
  tracker = null;
  if (video) {
    video.pause();
    video.srcObject = null;
    video = null;
  }
  landmarks = null;
  candidate = "NONE";
  stableGesture = "NONE";
  handAperture = lastPalm = null;
  pinchStart = 0;
  lastVideoTime = -1;
  targetX = targetY = 0;
  byId("sensor").classList.remove("live");
  showHand(false);
  setCameraState("待连接", "开启后，将单手放入取景框。画面仅在本机处理。", "开启摄像头");
}
async function connectCamera() {
  if (location.protocol === "file:") {
    setCameraState("请打开本地预览", "请在浏览器打开 http://127.0.0.1:8000/，再启用摄像头。", "重试连接");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setCameraState("摄像头不可用", "请通过 localhost 或 HTTPS 打开页面，再启用摄像头。", "重试连接");
    return;
  }
  const run = ++cameraRun;
  connecting = true;
  setCameraState("请求权限", "请允许浏览器使用摄像头。", "取消连接");
  let requestingMedia = true;
  try {
    const media = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    if (run !== cameraRun) {
      media.getTracks().forEach(track => track.stop());
      return;
    }
    stream = media;
    for (const track of stream.getVideoTracks()) {
      track.addEventListener("ended", () => {
        if (run !== cameraRun) return;
        disconnectCamera();
        setCameraState("摄像头已断开", "可以重新连接，或继续使用按键和鼠标。", "重试连接");
      }, { once: true });
    }
    requestingMedia = false;
    setCameraState("加载识别模型", "正在读取本地手势模型。", "取消连接");
    const { FilesetResolver, HandLandmarker } = await import(new URL("vision_bundle.mjs", visionBase).href);
    if (run !== cameraRun) return;
    const vision = await FilesetResolver.forVisionTasks(new URL("wasm", visionBase).href);
    if (run !== cameraRun) return;
    const options = {
      baseOptions: { modelAssetPath: handModel, delegate: "GPU" },
      runningMode: "VIDEO", numHands: 1,
      minHandDetectionConfidence: .55, minHandPresenceConfidence: .55, minTrackingConfidence: .55
    };
    let detector;
    try {
      detector = await HandLandmarker.createFromOptions(vision, options);
    } catch {
      if (run !== cameraRun) return;
      options.baseOptions.delegate = "CPU";
      detector = await HandLandmarker.createFromOptions(vision, options);
    }
    if (run !== cameraRun) {
      detector.close();
      return;
    }
    tracker = detector;
    video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    if (run !== cameraRun) return;
    connecting = false;
    byId("sensor").classList.add("live");
    setCameraState("等待手掌", "单手对准取景框。捏合可缩放。", "关闭摄像头");
  } catch (error) {
    if (run !== cameraRun) return;
    disconnectCamera();
    if (requestingMedia) {
      const message = error.name === "NotAllowedError" ? "浏览器未授予摄像头权限。可在地址栏调整权限后重试。" :
        "检查摄像头是否连接、是否被其他应用占用。";
      setCameraState("摄像头不可用", message, "重试连接");
    } else {
      console.warn("手势模型启动失败", error);
      setCameraState("手势连接失败", "请在 Edge 或 Chrome 刷新本地页面后重试。也可使用阵列按钮。", "重试连接");
    }
  }
}
cameraToggle.addEventListener("click", () => {
  if (connecting || stream) disconnectCamera();
  else connectCamera();
});
window.addEventListener("pagehide", disconnectCamera);

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function angleAt(lm, a, b, c) {
  const ax = lm[a].x - lm[b].x, ay = lm[a].y - lm[b].y;
  const cx = lm[c].x - lm[b].x, cy = lm[c].y - lm[b].y;
  const length = Math.hypot(ax, ay) * Math.hypot(cx, cy);
  return length > 1e-5 ? Math.acos(clamp((ax * cx + ay * cy) / length, -1, 1)) : Math.PI;
}
function classify(lm, ratio, palmLength) {
  const extended = (base, angle) =>
    angleAt(lm, base, base + 1, base + 3) > angle &&
    distance(lm[0], lm[base + 3]) - distance(lm[0], lm[base + 1]) > palmLength * .17;
  const index = extended(5, 2.2);
  const middle = extended(9, 2.5);
  const ring = extended(13, 2.5);
  const little = extended(17, 2.5);
  if (ratio < (pinchStart ? .57 : .43) && (index || middle || ring || little)) return "PINCH";
  if (!index && !middle && !ring && !little) return "COLLAPSE";
  if (index && middle && ring && little) return "NEBULA";
  if (index && middle && !ring && !little) return "WORMHOLE";
  if (index && !middle && !ring && !little) {
    // A relaxed thumb may look straight. An L needs the thumb to extend sideways past the palm.
    const acrossX = lm[5].x - lm[17].x, acrossY = lm[5].y - lm[17].y;
    const palmWidthSquared = acrossX * acrossX + acrossY * acrossY;
    const thumbOut = (lm[4].x - lm[5].x) * acrossX + (lm[4].y - lm[5].y) * acrossY;
    const thumbReach = (lm[4].x - lm[2].x) * acrossX + (lm[4].y - lm[2].y) * acrossY;
    const thumbSideways = thumbOut > palmWidthSquared * .32 && thumbReach > palmWidthSquared * .48;
    return thumbSideways && ratio > .80 && angleAt(lm, 2, 3, 4) > 2.25 ? "LOCK" : "DNA";
  }
  return "NONE";
}
function processHand(now) {
  const lm = landmarks;
  const palm = [lm[0], lm[9], lm[13], lm[17]];
  const cx = palm.reduce((sum, point) => sum + point.x, 0) / 4;
  const cy = palm.reduce((sum, point) => sum + point.y, 0) / 4;
  targetX = (0.5 - cx) * (mode === 0 ? .20 : .42);
  targetY = (cy - 0.5) * (mode === 0 ? .17 : .38);
  const palmLength = Math.max(distance(lm[0], lm[9]), .0001);
  const ratio = distance(lm[4], lm[8]) / palmLength;
  const gesture = classify(lm, ratio, palmLength);
  const extension = (distance(lm[0], lm[8]) + distance(lm[0], lm[12]) +
    distance(lm[0], lm[16]) + distance(lm[0], lm[20])) / (4 * palmLength);
  if (gesture !== "PINCH") {
    handAperture = gesture === "COLLAPSE" ? .015 : clamp((extension - .93) / .87, .015, .98);
  }
  if (mode === 0 && gesture === "NEBULA" && lastPalm) {
    const elapsed = now - lastPalm.time;
    const dx = lastPalm.x - cx, dy = cy - lastPalm.y;
    if (elapsed > 0 && elapsed < 130 && Math.hypot(dx, dy) > Math.max(.036, elapsed * .001) &&
      (!wake || now - wake.start > 420)) {
      emitWake(1 - cx, cy, dx, dy);
    }
  }
  lastPalm = { x: cx, y: cy, time: now };
  if (mode === 4 && gesture === "LOCK") {
    targetX = (.5 - lm[8].x) * .7;
    targetY = (lm[8].y - .5) * .56;
  }
  if (gesture === "PINCH") {
    if (!pinchStart) {
      pinchStart = Math.max(ratio, .08);
      pinchZoom = targetZoom;
    }
    targetZoom = clamp(pinchZoom * Math.pow(Math.max(ratio, .045) / pinchStart, .83), .55, 2.65);
  } else {
    pinchStart = 0;
  }
  if (gesture !== candidate) {
    candidate = gesture;
    candidateSince = now;
  }
  if (now - candidateSince > 165 && gesture !== stableGesture) {
    const index = gesture === "COLLAPSE" ? 0 : modes.findIndex(preset => preset.id === gesture);
    if (stableGesture === "COLLAPSE" && gesture === "NEBULA") emitPulse();
    stableGesture = gesture;
    if (index >= 0) selectMode(index);
  }
}
function drawCamera() {
  const w = cameraFeed.width, h = cameraFeed.height;
  const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
  const dw = video.videoWidth * scale, dh = video.videoHeight * scale;
  const dx = (w - dw) / 2, dy = (h - dh) / 2;
  cameraContext.save();
  cameraContext.translate(w, 0);
  cameraContext.scale(-1, 1);
  cameraContext.drawImage(video, dx, dy, dw, dh);
  cameraContext.restore();
  if (!landmarks) return;
  const x = p => w - (dx + dw * p.x);
  const y = p => dy + dh * p.y;
  cameraContext.strokeStyle = "#8be9ff";
  cameraContext.lineWidth = 1.6;
  cameraContext.beginPath();
  for (const [a, b] of connections) {
    cameraContext.moveTo(x(landmarks[a]), y(landmarks[a]));
    cameraContext.lineTo(x(landmarks[b]), y(landmarks[b]));
  }
  cameraContext.stroke();
  for (const [i, point] of landmarks.entries()) {
    cameraContext.fillStyle = i === 4 || i === 8 ? "#ffd3a1" : "#ddf7ff";
    cameraContext.beginPath();
    cameraContext.arc(x(point), y(point), 2.4, 0, TAU);
    cameraContext.fill();
  }
}
function updateCamera(now) {
  if (!tracker || !video || video.readyState < 2 || now - lastDetection < 33 || video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;
  lastDetection = now;
  let result;
  try {
    result = tracker.detectForVideo(video, now);
  } catch {
    disconnectCamera();
    setCameraState("识别中断", "摄像头已释放，可尝试重新连接。", "重试连接");
    return;
  }
  const detected = result.landmarks[0];
  if (detected?.length === 21) {
    if (landmarks) {
      for (let i = 0; i < 21; i++) {
        landmarks[i].x += (detected[i].x - landmarks[i].x) * .57;
        landmarks[i].y += (detected[i].y - landmarks[i].y) * .57;
      }
    } else {
      landmarks = detected.map(point => ({ x: point.x, y: point.y }));
    }
    lastSeen = now;
    processHand(now);
    showHand(true);
  } else if (now - lastSeen > 200) {
    landmarks = null;
    targetX = targetY = 0;
    candidate = "NONE";
    stableGesture = "NONE";
    handAperture = lastPalm = null;
    pinchStart = 0;
    showHand(false);
  }
  drawCamera();
}

function animate(now) {
  updateCamera(now);
  drawField(now);
  requestAnimationFrame(animate);
}
selectMode(0);
resize();
new ResizeObserver(resize).observe(field);
requestAnimationFrame(animate);
