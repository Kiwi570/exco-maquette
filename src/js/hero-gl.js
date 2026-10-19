// Ouverture : la photo apparaît cellule par cellule, comme un tableur qui se remplit (WebGL, OGL).
// Au survol, la cellule sous le curseur est sélectionnée (contour bleu et poignée, comme dans un tableur)
// et agit comme une loupe ; la grille se devine autour du curseur.
import { Renderer } from '../vendor/ogl/core/Renderer.js';
import { Program } from '../vendor/ogl/core/Program.js';
import { Mesh } from '../vendor/ogl/core/Mesh.js';
import { Texture } from '../vendor/ogl/core/Texture.js';
import { Triangle } from '../vendor/ogl/extras/Triangle.js';
import { onVisible } from './util.js';

const vertex = /* glsl */ `
attribute vec2 uv; attribute vec2 position;
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0., 1.); }`;

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform vec2 uRes; uniform vec2 uImg; uniform vec2 uPos;
uniform vec2 uMouse; uniform float uMouseOn;
uniform float uIntro; uniform float uCell;
uniform vec3 uPaper; uniform vec3 uInk; uniform vec3 uBlue;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 cover(vec2 uv){
  float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y;
  vec2 s = rs > ri ? vec2(1., ri / rs) : vec2(rs / ri, 1.);
  return uv * s + (1. - s) * uPos;
}
void main(){
  vec2 px = vUv * uRes;
  vec2 grid = ceil(uRes / uCell);
  vec2 cell = floor(px / uCell);
  vec2 f = fract(px / uCell);
  vec2 cc = (cell + .5) * uCell / uRes;
  vec2 mcell = floor(uMouse * uRes / uCell);
  float sel = (1. - step(.5, length(cell - mcell))) * uMouseOn;
  float dm = length(cell - mcell);
  float near = exp(-dm * .7) * uMouseOn;

  // loupe dans la cellule sélectionnée
  vec2 uv = mix(vUv, cc + (vUv - cc) * .72, sel);
  vec3 col = texture2D(tMap, cover(uv)).rgb;

  // apparition cellule par cellule : de gauche à droite et de haut en bas, avec un peu de désordre
  float order = (cell.x / grid.x) * .72 + (1. - cell.y / grid.y) * .28;
  float delay = order * .62 + hash(cell) * .22;
  float k = smoothstep(delay, delay + .16, uIntro * 1.05);
  col = mix(uPaper, col, k);
  col *= 1. + near * .05;

  // lignes de la grille : visibles avant l'apparition, puis seulement autour du curseur
  float lw = 1.0 / uCell * max(1., uRes.x / 1400.);
  float line = max(step(f.x, lw), step(f.y, lw));
  vec3 lineCol = mix(uInk, vec3(1.), k);
  float lineA = (1. - k) * .16 + k * near * .38;
  col = mix(col, lineCol, line * lineA);

  // contour de la cellule sélectionnée et poignée de recopie
  float bw = 2.2 / uCell * max(1., uRes.x / 1400.);
  float inner = step(bw, f.x) * step(bw, f.y) * step(f.x, 1. - bw) * step(f.y, 1. - bw);
  col = mix(col, uBlue, sel * (1. - inner) * k);
  vec2 hc = (mcell + vec2(1., 0.)) * uCell;
  vec2 hd = abs(px - hc);
  float hs = uCell * .075;
  float handle = step(hd.x, hs) * step(hd.y, hs) * uMouseOn;
  float handleRim = step(hd.x, hs + 1.5) * step(hd.y, hs + 1.5) * uMouseOn;
  col = mix(col, vec3(1.), (handleRim - handle) * k);
  col = mix(col, uBlue, handle * k);

  // grain fixe très léger
  col += (hash(px) - .5) * .025;
  gl_FragColor = vec4(col, 1.);
}`;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

export function initHeroGL(canvas, img) {
  if (!canvas || !img) return null;
  const box = canvas.parentElement;
  // sans WebGL, la photo reste affichée telle quelle
  try { const t = document.createElement('canvas'); if (!(t.getContext('webgl') || t.getContext('experimental-webgl'))) return null; } catch (e) { return null; }
  let renderer;
  try {
    renderer = new Renderer({ canvas, width: box.clientWidth || 300, height: box.clientHeight || 150, dpr: Math.min(window.devicePixelRatio || 1, 2), alpha: false, antialias: false, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  const gl = renderer.gl;
  if (!gl) return null;
  const texture = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE });
  const css = getComputedStyle(document.documentElement);
  const tok = (n, d) => (css.getPropertyValue(n).trim() || d);
  const program = new Program(gl, {
    vertex, fragment,
    uniforms: {
      tMap: { value: texture }, uRes: { value: [1, 1] }, uImg: { value: [1600, 1067] }, uPos: { value: [0.5, 0.5] },
      uMouse: { value: [0.5, 0.5] }, uMouseOn: { value: 0 }, uIntro: { value: 0 }, uCell: { value: 64 },
      uPaper: { value: hex(tok('--paper', '#F4F4F1')) }, uInk: { value: hex(tok('--ink', '#14202C')) }, uBlue: { value: hex(tok('--blue', '#008FC3')) },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  const pos = (getComputedStyle(img).objectPosition || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
  program.uniforms.uPos.value = [isNaN(pos[0]) ? .5 : pos[0], isNaN(pos[1]) ? .5 : 1 - pos[1]];

  let dirty = true;
  const setImage = () => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => {
      texture.image = im;
      program.uniforms.uImg.value = [im.naturalWidth, im.naturalHeight];
      box.classList.add('gl-on');
      dirty = true;
    };
    im.src = img.currentSrc || img.src;
  };
  if (img.complete && img.naturalWidth) setImage(); else img.addEventListener('load', setImage, { once: true });

  const resize = () => {
    const r = box.getBoundingClientRect();
    renderer.setSize(r.width, r.height);
    program.uniforms.uRes.value = [gl.canvas.width, gl.canvas.height];
    const dpr = gl.canvas.width / Math.max(1, r.width);
    program.uniforms.uCell.value = (r.width < 520 ? 44 : 64) * dpr;
    dirty = true;
  };
  resize();
  window.addEventListener('resize', resize);

  const m = { x: .5, y: .5, tx: .5, ty: .5, on: 0, ton: 0 };
  box.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    m.tx = (e.clientX - r.left) / r.width; m.ty = 1 - (e.clientY - r.top) / r.height; m.ton = 1;
    if (m.on < .01) { m.x = m.tx; m.y = m.ty; }
  });
  box.addEventListener('pointerleave', () => { m.ton = 0; });

  let raf = 0, visible = true, t0 = 0, intro = 0, started = false;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (!visible || !texture.image) return;
    if (started && intro < 1) { if (!t0) t0 = now; intro = Math.min(1, (now - t0) / 1900); dirty = true; }
    const px = m.x, py = m.y, po = m.on;
    m.x += (m.tx - m.x) * .22; m.y += (m.ty - m.y) * .22; m.on += (m.ton - m.on) * .12;
    if (Math.abs(m.x - px) + Math.abs(m.y - py) + Math.abs(m.on - po) > 1e-4) dirty = true;
    if (!dirty) return;
    const u = program.uniforms;
    u.uIntro.value = intro; u.uMouse.value = [m.x, m.y]; u.uMouseOn.value = m.on;
    renderer.render({ scene: mesh });
    dirty = false;
  };
  raf = requestAnimationFrame(loop);
  onVisible(canvas, (v) => { visible = v; dirty = true; });
  return {
    start() { started = true; },
    destroy() { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); },
  };
}
