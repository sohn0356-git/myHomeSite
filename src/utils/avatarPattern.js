function hashSeed(seed) {
  let hash = 2166136261;
  const text = String(seed || "seed");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function pickPalette(role, hash) {
  const teacherPalette = [
    ["#0f4c81", "#2d91d9", "#b7e3ff"],
    ["#144272", "#205295", "#cde6ff"],
    ["#234e70", "#2f6fa8", "#b6dcff"],
  ];
  const studentPalette = [
    ["#146356", "#24a17f", "#c8f3e2"],
    ["#0b7285", "#3ea8bf", "#c8f2fa"],
    ["#2d6a4f", "#40916c", "#d8f3dc"],
  ];
  const list = role === "선생님" ? teacherPalette : studentPalette;
  return list[hash % list.length];
}

export function getPatternAvatarDataUrl(seed, role = "학생") {
  const hash = hashSeed(seed);
  const [c1, c2, c3] = pickPalette(role, hash);
  const shapes = [];

  for (let i = 0; i < 6; i += 1) {
    const x = (hash >> (i * 3)) % 68;
    const y = (hash >> (i * 2 + 1)) % 68;
    const r = 8 + ((hash >> (i + 4)) % 14);
    const color = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3;
    shapes.push(
      `<circle cx="${x + 16}" cy="${y + 16}" r="${r}" fill="${color}" fill-opacity="0.86"/>`
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c3}"/>
        <stop offset="100%" stop-color="#ffffff"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#g)"/>
    ${shapes.join("")}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
