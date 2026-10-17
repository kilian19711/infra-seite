import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Soft round sprite so points render as glowing dots instead of squares.
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// One muted blue; the 3D is backdrop, not the show.
const CYAN = new THREE.Color('#4da3ff');
const VIOLET = new THREE.Color('#8fa3bf');

function fibonacciSphere(n, radius) {
  const pts = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    pts.push(new THREE.Vector3(Math.cos(phi * i) * r, y, Math.sin(phi * i) * r).multiplyScalar(radius));
  }
  return pts;
}

/** Network globe: glowing nodes, links between neighbours, data packets travelling on orbit rings. */
function buildGlobe(group, sprite) {
  const nodes = fibonacciSphere(900, 1.6);
  const pos = new Float32Array(nodes.length * 3);
  const col = new Float32Array(nodes.length * 3);
  nodes.forEach((p, i) => {
    p.toArray(pos, i * 3);
    CYAN.clone().lerp(VIOLET, (p.y + 1.6) / 3.2).toArray(col, i * 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  group.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.05, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  // Links: each 3rd node to its nearest neighbours.
  const lines = [];
  for (let i = 0; i < nodes.length; i += 3) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].distanceToSquared(nodes[j]) < 0.07) lines.push(...nodes[i].toArray(), ...nodes[j].toArray());
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending })));

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), new THREE.MeshBasicMaterial({ color: VIOLET, wireframe: true, transparent: true, opacity: 0.35 }));
  group.add(core);

  const packets = [];
  [[2.2, 0.4], [2.5, -0.7], [2.0, 1.2]].forEach(([r, tilt], k) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.004, 8, 200), new THREE.MeshBasicMaterial({ color: k % 2 ? VIOLET : CYAN, transparent: true, opacity: 0.5 }));
    ring.rotation.set(Math.PI / 2 + tilt, tilt, 0);
    group.add(ring);
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: k % 2 ? VIOLET : CYAN, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(0.18);
      ring.add(s);
      packets.push({ s, r, off: (i / 4) * Math.PI * 2, speed: 0.4 + k * 0.15 });
    }
  });

  return t => {
    core.rotation.x = t * 0.2;
    core.rotation.y = t * 0.3;
    packets.forEach(p => {
      const a = p.off + t * p.speed;
      p.s.position.set(Math.cos(a) * p.r, Math.sin(a) * p.r, 0);
    });
  };
}

/** Security core: nested wireframe shells + torus knot, pulsing like a shield. */
function buildCore(group, sprite) {
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.9, 0.25, 220, 20, 2, 3), new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.35 }));
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 2), new THREE.MeshBasicMaterial({ color: VIOLET, wireframe: true, transparent: true, opacity: 0.12 }));
  const shell2 = new THREE.Mesh(new THREE.OctahedronGeometry(2.4, 0), new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.2 }));
  const pts = new THREE.Points(new THREE.IcosahedronGeometry(1.9, 4), new THREE.PointsMaterial({ size: 0.04, map: sprite, color: CYAN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(knot, shell, shell2, pts);
  return t => {
    knot.rotation.set(t * 0.3, t * 0.4, 0);
    shell.rotation.y = -t * 0.15;
    shell2.rotation.set(t * 0.1, t * 0.2, 0);
    pts.rotation.y = -t * 0.15;
    const s = 1;
    shell.scale.setScalar(s);
    pts.scale.setScalar(s);
  };
}

/** Server rack lattice: a grid of cubes whose lights blink like activity LEDs. */
function buildLattice(group, sprite) {
  const N = 5, gap = 0.75, cubes = [];
  const box = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  const edges = new THREE.EdgesGeometry(box);
  for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) for (let z = 0; z < N; z++) {
    if (Math.random() > 0.55) continue;
    const m = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: (x + y + z) % 3 ? CYAN : VIOLET, transparent: true, opacity: 0.4 }));
    m.position.set((x - (N - 1) / 2) * gap, (y - (N - 1) / 2) * gap, (z - (N - 1) / 2) * gap);
    const led = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: CYAN, blending: THREE.AdditiveBlending, depthWrite: false }));
    led.scale.setScalar(0.25);
    m.add(led);
    group.add(m);
    cubes.push({ m, led, phase: Math.random() * 10 });
  }
  return t => {
    group.rotation.x = 0.4 + Math.sin(t * 0.2) * 0.1;
    cubes.forEach(c => {
      c.led.material.opacity = 0.25 + Math.sin(t * 0.5 + c.phase) * 0.1;
    });
  };
}

const BUILDERS = { globe: buildGlobe, core: buildCore, lattice: buildLattice };

export default function Scene3D({ variant = 'globe', className = '' }) {
  const host = useRef(null);

  useEffect(() => {
    const el = host.current;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return; // no WebGL – the CSS background still looks fine
    }
    // Up to 2x device pixels: crisp on 4K/retina without melting laptop GPUs.
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030507, 0.08);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 7);
    const sprite = glowTexture();
    const group = new THREE.Group();
    scene.add(group);
    const update = (BUILDERS[variant] || buildGlobe)(group, sprite);

    // Background dust for depth.
    const dust = new Float32Array(1500 * 3).map(() => (Math.random() - 0.5) * 24);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    const dustPts = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.03, map: sprite, color: 0x5a7bff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dustPts);

    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.position.z = camera.aspect < 1 ? 9 : 7;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const mouse = { x: 0, y: 0 };
    const onMove = e => {
      mouse.x = e.clientX / innerWidth - 0.5;
      mouse.y = e.clientY / innerHeight - 0.5;
    };
    addEventListener('pointermove', onMove);

    let visible = true, raf = 0;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf && !reduce) raf = requestAnimationFrame(tick); });
    io.observe(el);
    const clock = new THREE.Clock();
    function tick() {
      raf = 0;
      const t = clock.getElapsedTime();
      update(t);
      group.rotation.y += (mouse.x * 0.8 + t * 0.08 - group.rotation.y) * 0.05;
      group.rotation.z += (-mouse.y * 0.3 - group.rotation.z) * 0.05;
      dustPts.rotation.y = t * 0.01;
      renderer.render(scene, camera);
      if (visible && !reduce) raf = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      removeEventListener('pointermove', onMove);
      scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); });
      sprite.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [variant]);

  return <div ref={host} className={`scene3d ${className}`} style={{ opacity: 0.45 }} aria-hidden="true" />;
}
