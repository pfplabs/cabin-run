import test from 'node:test';
import assert from 'node:assert/strict';
import { mapTransform, headingVector, createMinimap } from '../minimap.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test('map is north up, centered, padded, and has equal scale', () => {
  const { project } = mapTransform([{ x: -100, z: -50 }, { x: 100, z: 50 }], 200, 20);
  assert.deepEqual(project({ x: 0, z: 0 }), { x: 100, y: 100 });
  assert.deepEqual(project({ x: -100, z: -50 }), { x: 20, y: 60 });
  assert.deepEqual(project({ x: 100, z: 50 }), { x: 180, y: 140 });
});
test('vehicle heading matches simulation: zero north, positive quarter turn east', () => {
  near(headingVector(0).x, 0); near(headingVector(0).y, -1);
  near(headingVector(Math.PI / 2).x, 1); near(headingVector(Math.PI / 2).y, 0);
  near(headingVector(Math.PI).y, 1); near(headingVector(-Math.PI / 2).x, -1);
});
function canvasFactory() {
  const canvases = [];
  const createCanvas = () => {
    const calls = [], attributes = {};
    const context = new Proxy({}, { get: (target, prop) => target[prop] ?? ((...args) => calls.push([prop, ...args])) });
    const canvas = { calls, attributes, getContext: () => context, setAttribute: (name, value) => { attributes[name] = value; } };
    canvases.push(canvas); return canvas;
  };
  return { createCanvas, canvases };
}
test('static terrain is cached and updates are throttled to 10 Hz', () => {
  const { createCanvas, canvases } = canvasFactory();
  const map = createMinimap({ createCanvas });
  const staticCalls = canvases[1].calls.length;
  const s = { x: 0, z: 100, heading: Math.PI / 2, phase: 'jeep' };
  assert.equal(map.update(s, 0), true);
  assert.equal(map.update(s, 50), false);
  assert.equal(map.update(s, 100), true);
  assert.equal(canvases[1].calls.length, staticCalls);
  assert.ok(canvases[0].calls.some(c => c[0] === 'rotate' && c[1] === Math.PI / 2));
  assert.equal(map.element.width, 384);
  assert.equal(map.element.attributes.role, 'img');
  assert.match(map.element.attributes['aria-label'], /North-up/);
});
test('off-map flight marker stays visible, and invalid states are ignored', () => {
  const { createCanvas, canvases } = canvasFactory();
  const map = createMinimap({ createCanvas });
  assert.equal(map.update({ x: NaN, z: 0, heading: 0 }, 0), false);
  assert.equal(map.update({ x: 1e6, z: -1e6, heading: 0, phase: 'plane' }, 0), true);
  assert.ok(canvases[0].calls.some(c => c[0] === 'translate' && c[1] === 185 && c[2] === 7));
  assert.ok(canvases[0].calls.some(c => c[0] === 'fillText' && c[1] === 'BEYOND MAP'));
});
