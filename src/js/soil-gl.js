// Hero : la photo de racines Grok devient vivante en WebGL (OGL).
// - déformation liquide autour du curseur
// - la sève (bleu et orange du logo) circule dans les racines claires de l'image
// - le curseur agit comme une lampe dans la terre
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
uniform vec2 uRes; uniform vec2 uImg;
uniform vec2 uMouse; uniform float uMouseOn; uniform float uVel;
uniform float uTime; uniform float uIntro; uniform vec2 uSource;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.03; a *= .5; } return v; }
vec2 cover(vec2 uv){ // object-fit: cover, ancré légèrement à droite
  float rs = uRes.x/uRes.y, ri = uImg.x/uImg.y;
  vec2 s = rs > ri ? vec2(1., ri/rs) : vec2(rs/ri, 1.);
  vec2 o = (1. - s) * vec2(.6, .5);
  return uv * s + o;
}
void main(){
  vec2 uv = vUv;
  float asp = uRes.x / uRes.y;
  vec2 m = uMouse; vec2 d = (uv - m) * vec2(asp, 1.);
  float dist = length(d);
  // déformation liquide : ondes autour du curseur + respiration lente
  float ripple = sin(dist * 34. - uTime * 3.2) * exp(-dist * 7.) * (0.006 + uVel * 0.02) * uMouseOn;
  vec2 flow = vec2(fbm(uv * 3. + uTime * .05), fbm(uv * 3. - uTime * .04)) - .5;
  vec2 duv = uv + normalize(d + 1e-5) * ripple + flow * .004;
  vec2 tuv = cover(duv);
  vec3 col = texture2D(tMap, tuv).rgb;
  // masque des racines : pixels clairs et peu saturés sous la ligne des pousses
  float lum = dot(col, vec3(.299, .587, .114));
  float sat = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
  float below = smoothstep(.22, .34, 1. - tuv.y); // sous la surface (y image inversé)
  float rootMask = smoothstep(.28, .62, lum) * (1. - smoothstep(.25, .55, sat)) * below;
  // sève : fronts d'onde partant de la source et du curseur
  float ds = length((tuv - uSource) * vec2(uImg.x/uImg.y, 1.));
  float w1 = pow(.5 + .5 * sin(ds * 26. - uTime * 2.4), 10.);
  float w2 = pow(.5 + .5 * sin(dist * 30. - uTime * 3.6), 12.) * exp(-dist * 3.) * uMouseOn;
  float hue = fbm(tuv * 4. + uTime * .03);
  vec3 sap = mix(vec3(.96, .60, .0), vec3(.24, .71, .86), smoothstep(.42, .62, hue));
  col += sap * rootMask * (w1 * .9 + w2 * 1.6) * uIntro;
  // lampe : le curseur éclaire la terre, le reste s'assombrit légèrement
  float lamp = exp(-dist * 4.2) * uMouseOn;
  col *= mix(.82, 1.0, lamp) ;
  col += vec3(.18, .12, .05) * lamp * .35;
  // grain
  col += (hash(uv * uRes + uTime) - .5) * .035;
  // apparition
  col *= smoothstep(0., 1., uIntro * 1.2);
  gl_FragColor = vec4(col, 1.);
}`;

export function initSoilGL(canvas, img, { reduced = false } = {}) {
  if (!canvas || !img) return null;
  let renderer;
  try {
    renderer = new Renderer({ canvas, width: canvas.parentElement.clientWidth || 300, height: canvas.parentElement.clientHeight || 150, dpr: Math.min(window.devicePixelRatio || 1, 1.5), alpha: false, antialias: false, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  const gl = renderer.gl;
  if (!gl) return null;
  const texture = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE });
  const program = new Program(gl, {
    vertex, fragment,
    uniforms: {
      tMap: { value: texture }, uRes: { value: [1, 1] }, uImg: { value: [1168, 784] },
      uMouse: { value: [0.7, 0.6] }, uMouseOn: { value: 0 }, uVel: { value: 0 }, uTime: { value: 0 }, uIntro: { value: 0 },
      uSource: { value: [0.62, 0.42] },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  const hero = canvas.closest('.hero');

  const setImage = () => {
    const src = img.currentSrc || img.src;
    const im = new Image(); im.decoding = 'async';
    im.onload = () => {
      texture.image = im;
      program.uniforms.uImg.value = [im.naturalWidth, im.naturalHeight];
      // source de la sève : centre du réseau (image large) ou haut des racines (image verticale)
      program.uniforms.uSource.value = im.naturalWidth > im.naturalHeight ? [0.66, 0.36] : [0.5, 0.7];
      hero && hero.classList.add('gl-on');
      if (reduced) { program.uniforms.uIntro.value = 1; renderer.render({ scene: mesh }); }
    };
    im.src = src;
  };
  if (img.complete && img.naturalWidth) setImage(); else img.addEventListener('load', setImage, { once: true });

  const resize = () => {
    const r = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(r.width, r.height);
    program.uniforms.uRes.value = [gl.canvas.width, gl.canvas.height];
    if (reduced && texture.image) renderer.render({ scene: mesh });
  };
  resize();
  window.addEventListener('resize', resize);

  const mouse = { x: 0.7, y: 0.6, tx: 0.7, ty: 0.6, on: 0, ton: 0, v: 0 };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width, ny = 1 - (e.clientY - r.top) / r.height;
    mouse.v = Math.min(1, mouse.v + Math.hypot(nx - mouse.tx, ny - mouse.ty) * 6);
    mouse.tx = nx; mouse.ty = ny; mouse.ton = 1;
  };
  if (!reduced) {
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', () => { mouse.ton = 0; });
  }

  let raf = 0, visible = true, t0 = performance.now(), intro = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (!visible || !texture.image) return;
    const t = (now - t0) / 1000;
    intro = Math.min(1, t / 1.6);
    mouse.x += (mouse.tx - mouse.x) * 0.08; mouse.y += (mouse.ty - mouse.y) * 0.08;
    mouse.on += (mouse.ton - mouse.on) * 0.05; mouse.v *= 0.94;
    const u = program.uniforms;
    u.uTime.value = t; u.uIntro.value = intro; u.uMouse.value = [mouse.x, mouse.y]; u.uMouseOn.value = mouse.on; u.uVel.value = mouse.v;
    renderer.render({ scene: mesh });
  };
  if (!reduced) {
    raf = requestAnimationFrame(loop);
    onVisible(canvas, (v) => { visible = v; });
  }
  return { renderer, program, destroy() { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); } };
}
