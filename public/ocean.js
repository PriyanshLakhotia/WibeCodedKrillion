// The scene is painted in low-resolution pixels and scaled by the canvas element.
// Landmarks and particles share a vertical camera, so the score moves the world.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (a, b, ratio) => a + (b - a) * ratio;
const ease = (value) => value * value * (3 - 2 * value);
const wrap = (value, length) => ((value % length) + length) % length;

const cloudShapes = [
  [
    1, 2, 2, 3, 5, 5, 6, 8, 11, 11, 10, 11, 14, 14, 15, 15, 14, 12, 12, 10, 11,
    11, 9, 8, 8, 7, 5, 5, 4, 3, 3, 2, 1,
  ],
  [
    1, 1, 2, 2, 4, 5, 4, 5, 7, 9, 9, 8, 9, 11, 12, 13, 13, 12, 10, 10, 9, 8, 7,
    6, 5, 5, 3, 3, 2, 1,
  ],
  [
    1, 2, 3, 4, 4, 6, 6, 8, 9, 8, 8, 8, 10, 12, 12, 11, 10, 8, 7, 8, 8, 7, 7, 5,
    4, 4, 2, 1,
  ],
];

const shrimpSkin = {
  ".": "#b73963",
  "+": "#f65380",
  o: "#ff829d",
  "*": "#ffbcc6",
  "#": "#52223f",
};
const shrimp = [
  "       ..                ",
  "     ..  ..              ",
  "   ..      ..            ",
  "       ....  .           ",
  "   ....    .. .          ",
  "             .o..        ",
  "    ......   .oo+.       ",
  "          ..o*o++..      ",
  "        ...o#o++oo+.     ",
  "      .. .o#+oo+++o+.    ",
  "         .+++.+++o+++.   ",
  "        .+.+..oo+.+++.   ",
  "        . .+. ...++oo+.  ",
  "       .  . .. ....+++.  ",
  "         .   .  . .o+.   ",
  "               ...o+.    ",
  "             ...*o+.     ",
  "            .+ooo++.     ",
  "             ..+o+.      ",
  "                ..       ",
];

const fish = [
  "       ..    .",
  "   ....+++..++",
  " ..oooo++++++.",
  ".oo+++++++o++.",
  " ...+++++.. ..",
  "    ...+.     ",
];
const fishDark = { ".": "#061122", "+": "#061020", o: "#0a1929" };
const deeperFish = { ".": "#070c1c", "+": "#090f20", o: "#0b1225" };

function sprite(rows, palette) {
  const image = document.createElement("canvas");
  image.width = Math.max(...rows.map((row) => row.length));
  image.height = rows.length;
  const brush = image.getContext("2d");
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (color) {
        brush.fillStyle = color;
        brush.fillRect(x, y, 1, 1);
      }
    }
  });
  return image;
}

const swimmer = sprite(shrimp, shrimpSkin);
const fishSprites = [sprite(fish, fishDark), sprite(fish, deeperFish)];

function bitmap(context, image, x, y, scale, reverse) {
  context.save();
  context.translate(Math.round(x), Math.round(y));
  if (reverse) context.scale(-1, 1);
  context.drawImage(
    image,
    0,
    0,
    Math.round(image.width * scale),
    Math.round(image.height * scale),
  );
  context.restore();
}

function drawBoat(ctx, x, y, clock, scale) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  const ink = "#15283a";
  const detail = "#263c4a";
  const hull = [
    [-22, -4, 43, 2],
    [-21, -2, 41, 2],
    [-19, 0, 36, 1],
    [-17, 1, 31, 1],
    [16, -5, 8, 2],
    [20, -6, 5, 1],
    [-20, -6, 3, 2],
    [-14, -5, 32, 1],
    [-8, -10, 15, 1],
    [-7, -9, 2, 5],
    [-1, -9, 2, 5],
    [5, -9, 2, 5],
    [-10, -11, 19, 1],
    [-3, -20, 1, 9],
    [-2, -19, 1, 8],
    [8, -7, 4, 2],
    [9, -8, 2, 1],
  ];
  ctx.fillStyle = ink;
  for (const rect of hull) ctx.fillRect(...rect);
  ctx.fillStyle = detail;
  ctx.fillRect(-18, -3, 7, 1);
  ctx.fillRect(-7, -10, 11, 1);
  ctx.fillRect(12, -3, 6, 1);
  const flap = Math.round(Math.sin(clock * 1.8));
  ctx.fillStyle = "#c95365";
  ctx.fillRect(-6, -20, 3, 5);
  ctx.fillRect(-9, -19, 3, 4);
  ctx.fillRect(-12, -18 + flap, 3, 3);
  ctx.fillStyle = "#e66d7b";
  ctx.fillRect(-9, -19, 3, 1);
  ctx.fillRect(-6, -20, 3, 1);
  ctx.restore();
}

function drawCloud(ctx, x, y, width, variant, shade) {
  const profile = cloudShapes[variant];
  const unit = Math.max(1, Math.round(width / profile.length));
  const heightUnit = Math.max(1, Math.round(unit * 0.61));
  for (let i = 0; i < profile.length; i++) {
    const top = y - profile[i] * heightUnit;
    const base =
      y + (i % 12 > 5 && i > 3 && i < profile.length - 4 ? heightUnit : 0);
    ctx.fillStyle = shade ? "#e2edf4" : "#fafafa";
    ctx.fillRect(x + i * unit, top, unit, base - top);
    const shadow = Math.max(
      0,
      3 +
        Math.round(Math.sin(i * 0.63) * 2) -
        (i > 0.77 * profile.length ? 3 : 0),
    );
    ctx.fillStyle = shade ? "#c6d9e6" : "#dfe8ef";
    ctx.fillRect(
      x + i * unit,
      Math.max(top, base - shadow * heightUnit),
      unit,
      Math.min(base - top, shadow * heightUnit),
    );
  }
}

function drawSun(ctx, x, y, r) {
  const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.9);
  halo.addColorStop(0, "#fff0a79c");
  halo.addColorStop(1, "#fff1ab00");
  ctx.fillStyle = halo;
  ctx.fillRect(x - 2 * r, y - 2 * r, 4 * r, 4 * r);
  const block = Math.max(2, Math.round(r / 11));
  for (let row = -11; row < 11; row++) {
    const half = Math.round(Math.sqrt(Math.max(0, 121 - (row + 0.5) ** 2)));
    ctx.fillStyle = row > 6 ? "#f1d284" : "#fae4a3";
    ctx.fillRect(x - half * block, y + row * block, half * block * 2, block);
    if (half > 2) {
      ctx.fillStyle = "#f8dfa0";
      ctx.fillRect(x - half * block, y + row * block, 2 * block, block);
    }
  }
}

// Stops are in world metres: each stratum stays registered to the right-hand ruler.
const waterStops = [
  [0, "#315980"],
  [26, "#284f74"],
  [36, "#24486b"],
  [40, "#1c3b58"],
  [44, "#1e405e"],
  [54, "#274b6b"],
  [115, "#24496c"],
  [260, "#203e5c"],
  [540, "#1e3758"],
  [1000, "#242e53"],
  [1800, "#1d2442"],
  [3000, "#141b32"],
  [4000, "#101527"],
  [6000, "#0a1020"],
  [7300, "#080d1b"],
];

function drawShafts(ctx, width, height, seaLevel, units, t) {
  const firstY = Math.max(0, Math.ceil(seaLevel));
  const endY = Math.min(height, Math.ceil(seaLevel + 330 * units));
  if (firstY >= endY) return;
  const spacing = Math.max(21, width * 0.113);
  const count = Math.ceil(width / spacing) + 3;
  const beam = ctx.createLinearGradient(0, seaLevel, 0, seaLevel + 330 * units);
  beam.addColorStop(0, "#a6d5e10e");
  beam.addColorStop(0.3, "#87bad40a");
  beam.addColorStop(1, "#739fbd00");
  ctx.fillStyle = beam;
  for (let i = -2; i < count; i++) {
    const startX = i * spacing + Math.sin(t * 0.14 + i * 5.2) * 3;
    const beamWidth = (i % 3 === 0 ? 0.31 : 0.13) * spacing;
    const slope = -0.13 - 0.08 * Math.sin(i * 2.1 + t * 0.055);
    ctx.beginPath();
    ctx.moveTo(startX + (firstY - seaLevel) * slope, firstY);
    ctx.lineTo(startX + beamWidth + (firstY - seaLevel) * slope, firstY);
    ctx.lineTo(startX + beamWidth * 0.72 + (endY - seaLevel) * slope, endY);
    ctx.lineTo(startX + (endY - seaLevel) * slope, endY);
    ctx.closePath();
    ctx.fill();
  }
}

function drawKelp(ctx, width, height, depth, t) {
  // Two nearby rocky outcrops cross the view more slowly than the depth markings.
  const bed = height * 1.04 - depth * 0.075;
  for (const [position, seed] of [
    [0.032, 2],
    [0.19, 11],
    [0.86, 22],
    [0.975, 35],
  ]) {
    const x = Math.round(width * position);
    const size = Math.max(0.75, Math.min(1.2, width / 410));
    const root = Math.round(bed + Math.sin(seed) * 9);
    ctx.fillStyle = "#173a4d";
    for (let j = 0; j < 5; j++) {
      const stem = x + (j - 2) * 2.8 * size;
      const tall = Math.round(
        (11 + Math.abs(Math.sin(seed * 2 + j * 1.41)) * 23) * size,
      );
      for (let a = 0; a < tall; a += 2) {
        const bend = (a / tall) ** 1.6;
        const px = Math.round(
          stem +
            bend * (Math.sin(t * 0.6 + seed + a * 0.1) * 3 + (j - 2) * 1.9),
        );
        ctx.fillRect(px, root - a, a > tall - 5 ? 1 : 2, 2);
        if (a % 8 === 2 && a < tall - 7) {
          const dir = (a + j) % 3 === 0 ? -1 : 1;
          ctx.fillRect(px + dir, root - a - 1, 2, 2);
          ctx.fillRect(px + dir * 2, root - a - 3, 2, 2);
        }
      }
    }
  }
}

function makeParticles(count) {
  let seed = 17271;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => ({
    x: next(),
    y: next(),
    phase: next() * Math.PI * 2,
    speed: 0.45 + next() * 1.4,
    layer: next(),
    bubble: next() > 0.85,
  }));
}

// Depth zones and pressure increments follow NOAA Ocean Service's light and pressure guides.
const landmarks = [
  [85, "blue light travels farthest"],
  [200, "the twilight zone begins"],
  [350, "sunlight dwindles"],
  [540, "lanternfish in the gloom"],
  [800, "about 80 atmospheres of pressure"],
  [1000, "the midnight zone begins"],
  [1350, "bioluminescence lights the darkness"],
  [1800, "giant squid roam these waters"],
  [2250, "water just above freezing"],
  [3000, "around 300 atmospheres"],
  [3682, "mean depth of the ocean"],
  [4000, "the abyss begins"],
  [4700, "cusk eels in the darkness"],
  [5200, "over 500 atmospheres"],
  [6000, "the hadal zone begins"],
  [6500, "deep ocean trenches"],
  [7000, "the bottom of this dive"],
];

function drawRuler(ctx, width, height, seaLevel, depth, submerge) {
  const narrow = width < 620;
  const x = width - (narrow ? 8 : 14);
  const firstVisible = Math.max(0, Math.ceil((-seaLevel - 5) / 20) * 10);
  const lastVisible = Math.min(7000, Math.ceil((height - seaLevel + 5) / 2));
  if (seaLevel > height) return;
  ctx.save();
  ctx.fillStyle = "#7185a34d";
  ctx.fillRect(x, Math.max(0, Math.round(seaLevel)), 1, height);
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.font = '12px "VT323", monospace';
  for (let m = firstVisible; m <= lastVisible; m += 10) {
    const y = Math.round(seaLevel + m * 2);
    const major = m % 100 === 0;
    const tickWidth = major ? 10 : m % 50 === 0 ? 7 : 4;
    ctx.fillStyle = major ? "#839eb77d" : "#7d95aa55";
    ctx.fillRect(x - tickWidth, y, tickWidth, 1);
    if (major) {
      ctx.fillStyle = "#a5b7ca8c";
      ctx.fillText(m.toLocaleString("en-US") + "m", x - 13, y + 1);
    }
  }
  if (submerge > 0.1) {
    ctx.globalAlpha = submerge;
    const markerY = Math.round(seaLevel + depth * 2);
    const markerLength = narrow ? 15 : 23;
    ctx.fillStyle = "#ff8fb0";
    ctx.fillRect(x - markerLength, markerY, markerLength + 2, 1);
    for (let i = 0; i < 4; i++)
      ctx.fillRect(x + 2 + i * 2, markerY - i, 2, i * 2 + 1);
    ctx.font = '14px "VT323", monospace';
    ctx.fillText("YOU", x - markerLength - 3, markerY);
    if (width >= 375) {
      ctx.font = (narrow ? "12px" : "14px") + ' "VT323", monospace';
      for (let i = 0; i < landmarks.length; i++) {
        const [metres, text] = landmarks[i];
        const y = Math.round(seaLevel + metres * 2);
        if (y < 12 || y > height - 14) continue;
        const left = i % 2 === 0 || narrow;
        const lx = left ? (narrow ? 12 : width * 0.08) : width * 0.92;
        ctx.textAlign = left ? "left" : "right";
        ctx.fillStyle = "#748da698";
        ctx.fillText(left ? "—  " + text : text + "  —", lx, y);
      }
    }
  }
  ctx.restore();
}

export function createOcean(canvas) {
  const screen = canvas.getContext("2d", { alpha: false });
  const pixels = document.createElement("canvas");
  const ctx = pixels.getContext("2d", { alpha: false });
  if (!ctx || !screen) return { update() {}, destroy() {} };
  canvas.style.imageRendering = "pixelated";
  canvas.setAttribute("aria-hidden", "true");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const particles = makeParticles(110);
  let scene = "surface";
  let depth = 0,
    submerge = 0,
    fromDepth = 0,
    toDepth = 0,
    fromWater = 0,
    toWater = 0,
    dip = 0,
    fromDip = 0;
  let started = 0,
    duration = 0,
    elapsed = 0,
    previous = 0,
    frame = 0,
    active = true;
  let width = 1,
    height = 1,
    motionCue = "",
    swimStart = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    // The original pixel pitch remains similar on desktop and phone.
    const pitch = clamp(rect.width / 420, 2, 4);
    width = Math.max(1, Math.round(rect.width / pitch));
    height = Math.max(1, Math.round(rect.height / pitch));
    const displayWidth = Math.max(1, Math.round(rect.width));
    const displayHeight = Math.max(1, Math.round(rect.height));
    if (
      pixels.width !== width ||
      pixels.height !== height ||
      canvas.width !== displayWidth ||
      canvas.height !== displayHeight
    ) {
      pixels.width = width;
      pixels.height = height;
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      ctx.imageSmoothingEnabled = false;
      screen.imageSmoothingEnabled = false;
      // Changing either dimension clears the visible bitmap. Repaint before the
      // ResizeObserver returns, including while a mobile keyboard changes the viewport.
      cancelAnimationFrame(frame);
      draw(performance.now(), true);
      return;
    }
    schedule();
  }

  function sky(seaLevel, offset, t) {
    const paint = ctx.createLinearGradient(
      0,
      seaLevel - height * 0.66,
      0,
      seaLevel,
    );
    paint.addColorStop(0, "#9bc8de");
    paint.addColorStop(0.55, "#cee5ee");
    paint.addColorStop(1, "#f0f5f6");
    ctx.fillStyle = paint;
    ctx.fillRect(0, 0, width, Math.max(0, Math.ceil(seaLevel + 3)));
    const short = Math.min(width, height * 1.6);
    drawSun(
      ctx,
      Math.round(0.84 * width),
      Math.round(-0.013 * height + offset),
      Math.round(short * 0.06),
    );
    const cloudData = [
      [0.1, 0.085, 0.31, 0, false],
      [0.54, 0.045, 0.18, 1, false],
      [-0.09, 0.2, 0.18, 1, true],
      [0.37, 0.22, 0.19, 2, false],
      [0.86, 0.22, 0.2, 0, false],
    ];
    for (const [x, y, size, variant, shade] of cloudData) {
      const drift = Math.sin(t * 0.028 + x * 6) * Math.min(5, width * 0.012);
      drawCloud(
        ctx,
        Math.round(width * x + drift),
        Math.round(height * y + offset),
        width * size,
        variant,
        shade,
      );
    }
    const boatScale = Math.max(0.77, Math.min(1.3, width / 425));
    const boatX = Math.round(width * 0.3 + Math.sin(t * 0.26) * 1.5);
    const boatY = Math.round(seaLevel + wave(boatX, t)) - 1;
    drawBoat(ctx, boatX, boatY, t, boatScale);
  }

  function wave(x, t) {
    return (
      Math.sin(x / 21 + t * 0.62) * 0.9 + Math.sin(x / 47 - t * 0.5) * 0.45
    );
  }

  function water(seaLevel, t, progress, units, immersion) {
    const abyss = clamp(Math.log1p(depth / 180) / 3.7, 0, 1);
    const boundary = Math.max(0, Math.round(seaLevel + 2));
    function fillWater(paint) {
      ctx.fillStyle = paint;
      ctx.fillRect(0, boundary, width, Math.max(0, height - boundary));
      if (seaLevel <= -3) return;
      for (let x = 0; x < width; x += 2) {
        const y = Math.round(seaLevel + wave(x, t));
        ctx.fillRect(x, y, 2, Math.max(1, boundary - y + 1));
      }
    }
    if (immersion < 1) {
      const glow = Math.max(18, height * 0.145);
      const surfaceWater = ctx.createLinearGradient(
        0,
        seaLevel - 1,
        0,
        seaLevel + glow,
      );
      surfaceWater.addColorStop(0, "#305678");
      surfaceWater.addColorStop(0.35, "#1f3853");
      surfaceWater.addColorStop(0.82, "#0d1727");
      surfaceWater.addColorStop(1, "#090f1b");
      fillWater(surfaceWater);
    }
    if (immersion > 0) {
      const bottom = waterStops[waterStops.length - 1][0];
      const waterColumn = ctx.createLinearGradient(
        0,
        seaLevel,
        0,
        seaLevel + bottom * units,
      );
      for (const [metres, ink] of waterStops)
        waterColumn.addColorStop(metres / bottom, ink);
      ctx.globalAlpha = immersion;
      fillWater(waterColumn);
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, Math.max(0, Math.ceil(seaLevel + 2)), width, height);
    ctx.clip();
    if (immersion > 0) {
      ctx.globalAlpha = immersion;
      drawShafts(ctx, width, height, seaLevel, units, t);
      const kelpAlpha = 1 - clamp((depth - 90) / 150, 0, 1);
      if (kelpAlpha > 0) {
        ctx.globalAlpha = immersion * kelpAlpha * 0.8;
        drawKelp(ctx, width, height, depth, t);
      }
    }
    const current = height * 0.607 - seaLevel;
    for (const p of particles) {
      const span = height + 12;
      const y = Math.round(
        wrap(
          p.y * span -
            current * (0.35 + p.layer) -
            t * p.speed * (p.bubble ? 1.6 : 0.65),
          span,
        ) - 6,
      );
      const x = Math.round(p.x * width + Math.sin(p.phase + t * 0.31) * 1.7);
      ctx.globalAlpha =
        (p.bubble ? 0.18 : 0.11) + p.layer * (p.bubble ? 0.24 : 0.18);
      ctx.fillStyle = p.bubble ? "#75c3cf" : "#5b8cac";
      if (p.bubble && p.layer > 0.59) {
        ctx.fillRect(x, y - 1, 1, 1);
        ctx.fillRect(x - 1, y, 1, 1);
        ctx.fillRect(x + 1, y, 1, 1);
        ctx.fillRect(x, y + 1, 1, 1);
      } else {
        ctx.fillRect(
          x,
          y,
          1,
          scene === "descent" && duration && p.layer > 0.78 ? 2 : 1,
        );
      }
    }
    ctx.globalAlpha = 1;
    for (let k = 0; k < 3; k++) {
      const flow = k % 2 === 0 ? 1 : -1;
      const lead =
        wrap(
          width * (0.16 + 0.34 * k) + flow * t * (1.0 + k * 0.24),
          width + 62,
        ) - 25;
      const waterY = Math.round(
        wrap(
          height * (0.82 + k * 0.28) - current * (0.54 + k * 0.12),
          height + 26,
        ) - 7,
      );
      for (let j = 0; j < 4 + k; j++) {
        const x = wrap(lead + j * (17 + k * 8) * flow, width + 24) - 12;
        const y =
          waterY + Math.sin(j * 2.3 + t * 0.59) * 2 + Math.floor(j / 3) * 6;
        ctx.globalAlpha = 0.67;
        bitmap(
          ctx,
          fishSprites[abyss > 0.55 ? 1 : 0],
          x,
          y,
          k === 2 ? 0.62 : 0.75,
          flow > 0,
        );
      }
    }
    ctx.restore();

    // On launch she kicks into the air beside the boat, then drops into open water.
    const age = Math.max(0, t - swimStart);
    const drift = 0.48 - Math.cos(age * 0.115) * 0.415;
    const homeX = width * (0.715 + Math.sin(t * 0.15) * 0.023);
    const swimY = height * (0.54 + Math.sin(age * 0.27) * 0.065);
    let krillX = mix(homeX, width * drift, immersion);
    let krillY =
      mix(height * 0.71, swimY, immersion) + Math.sin(t * 0.82) * 2.2;
    if (motionCue === "launch" && progress < 1) {
      const leap = clamp((progress - 0.3) / 0.54, 0, 1);
      const stroke = ease(clamp(progress / 0.3, 0, 1));
      const splashX = width * 0.205;
      if (progress < 0.3) {
        krillX = mix(homeX, width * 0.365, stroke);
        krillY = mix(height * 0.71, seaLevel - 5, stroke);
      } else if (leap < 1) {
        krillX = mix(width * 0.365, splashX, leap);
        krillY = seaLevel - 5 - Math.sin(Math.PI * leap) * height * 0.17;
      } else {
        const entry = ease(clamp((progress - 0.84) / 0.16, 0, 1));
        krillX = mix(splashX, width * drift, entry);
        krillY = mix(seaLevel - 5, swimY, entry);
        ctx.save();
        ctx.fillStyle = "#accfe3";
        ctx.globalAlpha = 1 - entry;
        for (let i = -2; i <= 2; i++) {
          const dropX = splashX + i * (2 + 6 * entry);
          const dropY =
            seaLevel - Math.sin(Math.PI * entry) * (6 + 3 * Math.abs(i));
          ctx.fillRect(Math.round(dropX), Math.round(dropY), 1, 2);
        }
        ctx.restore();
      }
    }
    const little = Math.min(width, height * 1.6);
    ctx.save();
    ctx.globalAlpha = mix(0.86, 0.98, immersion);
    const facingRight = immersion > 0.75 && Math.sin(age * 0.115) > 0;
    bitmap(
      ctx,
      swimmer,
      krillX + (facingRight ? 10 : -10),
      krillY,
      clamp(little / 455, 0.68, 1.02),
      facingRight,
    );
    ctx.restore();
  }

  function draw(now, force = false) {
    frame = 0;
    if (!active || document.hidden) return;
    const delta = previous ? Math.min(0.12, (now - previous) / 1000) : 0;
    // Match the display cadence during camera travel. Idle water can move more slowly.
    if (
      !force &&
      duration === 0 &&
      delta < 1 / 24 &&
      previous &&
      !motion.matches
    ) {
      schedule();
      return;
    }
    previous = now;
    if (!motion.matches) elapsed += delta;
    const progress =
      motion.matches || duration === 0
        ? 1
        : clamp((now - started) / duration, 0, 1);
    const fraction = ease(progress);
    depth = mix(fromDepth, toDepth, fraction);
    submerge = mix(fromWater, toWater, fraction);
    if (progress === 1) duration = 0;
    const pixelsPerMetre = (2 * height) / canvas.height;
    const anchor = height * (0.3 + 0.115 * Math.min(1, depth / 100));
    const nearSurface = 1 - ease(clamp(depth / 200, 0, 1));
    const immersion = 1 - (1 - submerge) * nearSurface;
    dip = fromDip * (1 - fraction);
    if (motionCue === "next") dip += 0.12 * Math.sin(Math.PI * progress) ** 2;
    // Only the framing changes at the surface. Every world metre always occupies
    // two display pixels, through launch, interruption, descent and resurfacing.
    const seaLevel = Math.round(
      mix(height * 0.607, anchor, immersion) -
        depth * pixelsPerMetre -
        dip * height,
    );
    const offset = seaLevel - height * 0.607;
    if (seaLevel > -3) sky(seaLevel, offset, elapsed);
    water(seaLevel, elapsed, progress, pixelsPerMetre, immersion);
    screen.drawImage(pixels, 0, 0, canvas.width, canvas.height);
    drawRuler(
      screen,
      canvas.width,
      canvas.height,
      (seaLevel * canvas.height) / height,
      depth,
      immersion,
    );
    if (!motion.matches) schedule();
  }

  function schedule() {
    if (active && !frame && !document.hidden)
      frame = requestAnimationFrame(draw);
  }

  function onVisibility() {
    previous = 0;
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else schedule();
  }

  function update(options = {}) {
    const nextScene = ["surface", "playing", "descent", "summary"].includes(
      options.scene,
    )
      ? options.scene
      : scene;
    const nextDepth = Number.isFinite(options.depth)
      ? clamp(options.depth, 0, 7000)
      : toDepth;
    if (
      nextScene === scene &&
      nextDepth === toDepth &&
      !(options.duration === 0 && duration > 0)
    )
      return;
    const nextWater = nextScene === "surface" ? 0 : 1;
    const fallback = nextWater !== toWater ? (nextWater ? 1300 : 1550) : 1350;
    motionCue = "";
    if (scene === "descent" && nextScene === "playing" && nextDepth === toDepth)
      motionCue = "next";
    if (scene === "surface" && nextScene === "playing" && nextDepth === 0)
      motionCue = "launch";
    scene = nextScene;
    fromDepth = depth;
    fromWater = submerge;
    fromDip = dip;
    toDepth = nextDepth;
    toWater = nextWater;
    started = performance.now();
    duration = Number.isFinite(options.duration)
      ? Math.max(0, options.duration)
      : fallback;
    if (motionCue === "launch")
      swimStart = elapsed + (motion.matches ? 0 : duration / 1000);
    if (duration === 0 || motion.matches) {
      cancelAnimationFrame(frame);
      draw(performance.now(), true);
    } else schedule();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  motion.addEventListener("change", schedule);
  resize();
  return {
    update,
    destroy() {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", schedule);
    },
  };
}
