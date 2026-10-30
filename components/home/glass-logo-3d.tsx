"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

const MARK_PATH =
  "M0 35C0 16.6807 14.0744 1.64844 32 0.126953V141H51.0523C52.4308 137.344 54.7446 133.689 57.9938 130.033C61.1446 126.508 64.6892 123.44 68.6277 120.829C72.5662 118.349 76.3569 116.782 80 116.129V86.7544C75.4708 87.9292 71.3846 89.6919 67.7415 92.0415C64 94.5225 60.7508 97.46 57.9938 100.854C56.5345 102.72 55.2545 104.659 54.1539 106.671V0H125C144.33 0 160 15.6699 160 35V125C160 144.33 144.33 160 125 160H124V18H104.948C103.569 21.6816 101.255 25.3628 98.0062 29.0444C94.8554 32.5942 91.3108 35.6841 87.3723 38.314C83.4338 40.812 79.6431 42.3896 76 43.0474V72.6304C80.5292 71.4473 84.6154 69.6724 88.2585 67.3057C92 64.8076 95.2492 61.8491 98.0062 58.4307C99.4655 56.5513 100.745 54.5986 101.846 52.5723V160H35C15.67 160 0 144.33 0 125V35Z";

const SCALE = 1 / 92; // 160 SVG units -> ~1.74 scene units
const DEPTH = 30;

/**
 * SVG coords (y-down, 0..160) -> centred scene coords (y-up). Flips y by
 * rotating half a turn about X rather than mirroring, so face winding stays
 * correct and the front and back faces render.
 */
function toScene(geometry: THREE.BufferGeometry) {
  geometry.scale(SCALE, SCALE, SCALE);
  geometry.rotateX(Math.PI);
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The Studio1 mark itself extruded as a glass block: the "L" and "1" strokes
 * are cut straight through, so they are truly empty (you see the page behind
 * them), and the logo keeps its exact shape. A small bevel keeps the thin
 * strokes crisp.
 */
function useLogoGeometry() {
  return useMemo(() => {
    const data = new SVGLoader().parse(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path fill-rule="evenodd" d="${MARK_PATH}"/></svg>`,
    );
    const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
    const tile = toScene(
      new THREE.ExtrudeGeometry(shapes, {
        depth: DEPTH,
        bevelEnabled: true,
        bevelThickness: 4,
        bevelSize: 2,
        bevelSegments: 8,
        curveSegments: 48,
      }),
    );
    // Brand gradient baked into vertex colours, matching the flat logo:
    // red (#FE3C34) at the bottom-left to orange (#FE8B4B) at the top-right.
    tile.computeBoundingBox();
    const box = tile.boundingBox!;
    const position = tile.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const from = new THREE.Color("#FE3C34");
    const to = new THREE.Color("#FE8B4B");
    const mixed = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
      const u = (position.getX(i) - box.min.x) / (box.max.x - box.min.x);
      const v = (position.getY(i) - box.min.y) / (box.max.y - box.min.y);
      mixed.copy(from).lerp(to, THREE.MathUtils.clamp((u + v) / 2, 0, 1));
      colors.set([mixed.r, mixed.g, mixed.b], i * 3);
    }
    tile.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return { tile };
  }, []);
}

/** Warm light field the glass refracts: peach core falling off to ember. */
function useGlowTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size * 0.42, size * 0.35, 0, size / 2, size / 2, size * 0.72);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.55, "#fff3ea");
    gradient.addColorStop(0.85, "#ffd9bf");
    gradient.addColorStop(1, "#fdba74");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

/** Canvas background matched to the page so the 3D block sits on it seamlessly. */
function Backdrop() {
  const { scene } = useThree();
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      scene.background = new THREE.Color(root.classList.contains("dark") ? "#0e0b09" : "#f6f2ec");
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [scene]);

  return null;
}

function Logo({ reduceMotion }: { reduceMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const { tile } = useLogoGeometry();
  const glow = useGlowTexture();
  const { gl } = useThree();

  useEffect(
    () => () => {
      tile.dispose();
      glow.dispose();
    },
    [tile, glow],
  );

  useFrame((state, delta) => {
    const group = ref.current;
    if (!group) return;
    // Synced to scroll: angle follows the canvas' position in the viewport,
    // face-on when centred, turning as it enters and leaves (reverses on scroll up).
    const rect = gl.domElement.getBoundingClientRect();
    const progress = THREE.MathUtils.clamp(
      (rect.top + rect.height / 2) / window.innerHeight,
      -0.2,
      1.2,
    );
    // Gentle sway (about ±20° at the edges) so the front face stays readable.
    const turn = reduceMotion ? 0 : (0.5 - progress) * 0.7;
    const tilt = reduceMotion ? 0.06 : 0.06 + (progress - 0.5) * 0.16;
    // Slow follow, so the turn glides rather than tracking the scrollbar 1:1.
    const ease = Math.min(1, delta * 1.6);
    group.rotation.y += (turn - group.rotation.y) * ease;
    group.rotation.x += (tilt - group.rotation.x) * ease;
    if (!reduceMotion) group.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
  });

  return (
    <group ref={ref}>
      {/* The mark as glossy glass in the brand gradient; the cut-out strokes stay empty. */}
      <mesh geometry={tile}>
        <meshPhysicalMaterial
          vertexColors
          roughness={0.28}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.06}
          ior={1.5}
          specularIntensity={0.6}
          envMapIntensity={2.2}
        />
      </mesh>
    </group>
  );
}

export default function GlassLogo3D({
  running,
  reduceMotion,
}: {
  running: boolean;
  reduceMotion: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      // True brand colours: no film tone mapping washing out the gradient.
      flat
      camera={{ position: [0, 0, 4.4], fov: 30 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      frameloop={running ? "always" : "never"}
      // Skip shader info-log reads: some Windows drivers emit harmless
      // precision warnings (X4122) for the transmission shaders.
      onCreated={({ gl }) => {
        gl.debug.checkShaderErrors = false;
      }}
    >
      <Backdrop />
      {/* Studio light strips: the bright edge highlights on the glass */}
      <Environment resolution={256}>
        <Lightformer intensity={5} position={[0, 4, 3]} scale={[8, 1.5, 1]} />
        <Lightformer intensity={0.6} color="#fff4ea" position={[0, 0, 5]} scale={[6, 6, 1]} />
        <Lightformer intensity={3} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 1, 1]} />
        <Lightformer intensity={3} position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[6, 1, 1]} />
        <Lightformer intensity={1.5} color="#ffd9bf" position={[2, -3, 3]} scale={[4, 2.5, 1]} />
      </Environment>
      <Logo reduceMotion={reduceMotion} />
    </Canvas>
  );
}
