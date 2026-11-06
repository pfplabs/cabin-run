import * as world from './engine.js';

/** North-up map transform: world -Z is north; equal scale on both axes. */
export function mapTransform(points, size = 192, padding = 15) {
  const xs = points.map(p => p.x), zs = points.map(p => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const scale = (size - padding * 2) / Math.max(maxX - minX, maxZ - minZ, 1);
  const centerX = (minX + maxX) / 2, centerZ = (minZ + maxZ) / 2;
  return { scale, project: ({ x, z }) => ({ x: size / 2 + (x - centerX) * scale, y: size / 2 + (z - centerZ) * scale }) };
}

export function headingVector(heading) {
  return { x: Math.sin(heading), y: -Math.cos(heading) };
}

/**
 * Lightweight cached Canvas2D HUD. Append `element` and call update(simulationState)
 * from the frame loop. State: {x,z,heading,phase:'jeep'|'plane'}; update returns
 * true only when repainted (10Hz). Optional time argument is milliseconds.
 * CSS owns display size; backing size is fixed at 2x for crisp small screens.
 * No listeners, WebGL contexts, animation loops, or cleanup obligations.
 */
export function createMinimap({ size = 192, createCanvas = () => document.createElement('canvas'), now = () => performance.now() } = {}) {
  const element = createCanvas(), backdrop = createCanvas();
  element.className = 'lake-minimap';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', 'North-up lake map. Gold arrow shows your vehicle and direction. H marks home, D marks dock.');
  element.textContent = 'North-up lake map: gold arrow is your vehicle; H is home; D is dock.';
  for (const canvas of [element, backdrop]) { canvas.width = size * 2; canvas.height = size * 2; }
  const ctx = element.getContext('2d'), bg = backdrop.getContext('2d');
  if (!ctx || !bg) return { element, canvas: element, update: () => false };
  ctx.scale(2, 2); bg.scale(2, 2);
  const road = [], lake = [];
  for (let i = 0; i < 256; i++) {
    const a = i / 256 * Math.PI * 2;
    road.push(world.roadPoint(a));
    lake.push(world.lakeBoundaryPoint ? world.lakeBoundaryPoint(a) : {
      x: world.LAKE.x + world.LAKE.rx * Math.sin(a),
      z: world.LAKE.z - world.LAKE.rz * Math.cos(a)
    });
  }
  const { project } = mapTransform([...road, ...lake, world.HOME, world.DOCK], size);
  const path = (points, close = false) => {
    bg.beginPath();
    points.forEach((p, i) => { const q = project(p); bg[i ? 'lineTo' : 'moveTo'](q.x, q.y); });
    if (close) bg.closePath();
  };
  bg.fillStyle = '#152b29'; bg.fillRect(0, 0, size, size);
  path(lake, true); bg.fillStyle = '#356b7a'; bg.fill();
  bg.strokeStyle = '#74a3ac'; bg.lineWidth = 1; bg.stroke();
  path(road, true); bg.strokeStyle = '#a4b7a4'; bg.lineWidth = 2; bg.stroke();
  if (world.DRIVEWAY) { path(world.DRIVEWAY); bg.strokeStyle = '#90a18c'; bg.lineWidth = 1; bg.stroke(); }
  const highlight = (start, end, color) => {
    const points = Array.from({ length: 20 }, (_, i) => world.roadPoint(start + (end - start) * i / 19));
    path(points); bg.strokeStyle = color; bg.lineWidth = 3; bg.stroke();
  };
  if (world.TUNNEL) highlight(world.TUNNEL.startAngle, world.TUNNEL.endAngle, '#485454');
  if (world.BRIDGE) highlight(world.BRIDGE.angle - world.BRIDGE.halfAngle, world.BRIDGE.angle + world.BRIDGE.halfAngle, '#e0c39a');
  bg.font = 'bold 10px system-ui, sans-serif'; bg.textBaseline = 'middle';
  for (const [point, label, offset] of [[world.HOME, 'H', -9], [world.DOCK, 'D', 9]]) {
    const p = project(point);
    bg.fillStyle = '#f2e9cd'; bg.fillRect(p.x - 2, p.y - 2, 4, 4);
    bg.fillText(label, p.x + 5, p.y + offset);
  }
  bg.fillStyle = '#dce8de'; bg.fillText('N ↑', 10, 12);
  bg.font = '9px system-ui, sans-serif'; bg.fillText('LAKE MAP', 10, size - 10);
  let lastDraw = -Infinity;
  function update(state, time = now()) {
    if (![state.x, state.z, state.heading, time].every(Number.isFinite)) return false;
    if (time >= lastDraw && time - lastDraw < 100) return false;
    lastDraw = time;
    ctx.clearRect(0, 0, size, size); ctx.drawImage(backdrop, 0, 0, size, size);
    const p = project(state), edge = 7;
    const x = Math.max(edge, Math.min(size - edge, p.x));
    const y = Math.max(edge, Math.min(size - edge, p.y));
    const outside = x !== p.x || y !== p.y;
    ctx.save(); ctx.translate(x, y); ctx.rotate(state.heading);
    ctx.beginPath(); ctx.moveTo(0, -7);
    if (state.phase === 'plane') {
      ctx.lineTo(2, -1); ctx.lineTo(7, 3); ctx.lineTo(2, 3); ctx.lineTo(2, 6);
      ctx.lineTo(-2, 6); ctx.lineTo(-2, 3); ctx.lineTo(-7, 3); ctx.lineTo(-2, -1);
    } else { ctx.lineTo(5, 5); ctx.lineTo(0, 3); ctx.lineTo(-5, 5); }
    ctx.closePath(); ctx.fillStyle = outside ? '#ffb680' : '#ffe298';
    ctx.strokeStyle = '#172525'; ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke(); ctx.restore();
    if (outside) { ctx.fillStyle = '#ffdcba'; ctx.font = '9px system-ui, sans-serif'; ctx.fillText('BEYOND MAP', size - 78, size - 10); }
    return true;
  }
  return { element, canvas: element, update };
}
