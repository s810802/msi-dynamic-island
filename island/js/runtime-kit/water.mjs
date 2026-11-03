/**
 * Small, dependency-injected sea surface for a miniature island scene.
 *
 * Supported path: modern THREE.WebGLRenderer rendering directly to the canvas,
 * ColorManagement enabled (Linear-sRGB working space), outputColorSpace =
 * THREE.SRGBColorSpace. The rest of the scene can keep ACES and its exposure.
 * This material skips tone mapping and scene fog, then applies Three's output
 * color-space conversion exactly once. No background or renderer is changed.
 * Post-processing with an OutputPass, HDR render targets, and WebGPURenderer
 * need a separate color pipeline; do not assume the same result there.
 *
 * Sea/deep are CSS/hex colors or THREE.Color values (already in working space).
 * The opaque, flat plane uses subtle shader ripples, not geometry displacement
 * or real shoreline depth. nearDistance/farDistance describe a radial color
 * gradient from the center of this plane in local scene units.
 */
export function createIslandWater(THREE, options = {}) {
  if (!THREE?.ShaderMaterial || !THREE?.PlaneGeometry || !THREE?.Color) {
    throw new TypeError('Pass the Three.js namespace as the first argument.');
  }
  if (THREE.ColorManagement?.enabled === false) {
    throw new Error('Island water requires THREE.ColorManagement.enabled = true.');
  }
  if (THREE.ColorManagement?.workingColorSpace && THREE.LinearSRGBColorSpace &&
      THREE.ColorManagement.workingColorSpace !== THREE.LinearSRGBColorSpace) {
    throw new Error('Island water requires the Linear-sRGB working color space.');
  }

  const {
    sea = '#93d9cc',
    deep = '#71bcb5',
    size = 250,
    height = -0.24,
    nearDistance = 9,
    farDistance = 45,
    waveStrength = 0.016,
    glintStrength = 0.035,
    speed = 1,
  } = options;

  for (const [name, value] of Object.entries({
    size, height, nearDistance, farDistance, waveStrength, glintStrength, speed,
  })) {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite.`);
  }
  if (size <= 0 || nearDistance < 0 || farDistance <= nearDistance ||
      waveStrength < 0 || glintStrength < 0 || speed < 0) {
    throw new RangeError('Use size > 0, 0 <= nearDistance < farDistance, and nonnegative strengths/speed.');
  }

  // THREE.Color decodes CSS/hex sRGB inputs into the linear working space.
  // Do not also call convertSRGBToLinear() or encode these uniforms manually.
  const uniforms = {
    uSea: { value: new THREE.Color(sea) },
    uDeep: { value: new THREE.Color(deep) },
    uTime: { value: 0 },
    uNear: { value: nearDistance },
    uFar: { value: farDistance },
    uWaveStrength: { value: waveStrength },
    uGlintStrength: { value: glintStrength },
  };
  const material = new THREE.ShaderMaterial({
    name: 'IslandWaterMaterial',
    uniforms,
    toneMapped: false,
    fog: false,
    vertexShader: /* glsl */`
      varying vec2 vWaterPosition;
      void main() {
        vWaterPosition = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uSea;
      uniform vec3 uDeep;
      uniform float uTime;
      uniform float uNear;
      uniform float uFar;
      uniform float uWaveStrength;
      uniform float uGlintStrength;
      varying vec2 vWaterPosition;

      void main() {
        vec2 p = vWaterPosition;
        float distanceBlend = smoothstep(uNear, uFar, length(p));
        vec3 color = mix(uSea, uDeep, distanceBlend);

        // Broad, low-contrast movement keeps the water clear at island scale.
        float broad = sin(p.x * 0.39 + uTime * 0.32)
                    * cos(p.y * 0.31 - uTime * 0.25);
        float ripple = sin(p.x * 1.5 + p.y * 0.8 + uTime * 0.7)
                     * sin(p.y * 1.1 - p.x * 0.5 - uTime * 0.17);
        color *= 1.0 + broad * uWaveStrength;
        float glint = smoothstep(0.965, 1.0, ripple * 0.5 + 0.5);
        color = mix(color, vec3(1.0), glint * uGlintStrength);

        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const geometry = new THREE.PlaneGeometry(size, size);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'IslandWater';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = height;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  let disposed = false;

  return {
    mesh,
    material,
    // Absolute simulation seconds: keep this time unchanged to pause motion.
    // No clock, requestAnimationFrame, or hidden timer is owned by this module.
    update(timeSeconds) {
      if (!Number.isFinite(timeSeconds)) throw new TypeError('timeSeconds must be finite.');
      uniforms.uTime.value = timeSeconds * speed;
    },
    // Mutates only the existing color uniforms, keeping mesh/geometry/material.
    setColors(colors = {}) {
      if (colors.sea !== undefined) uniforms.uSea.value.set(colors.sea);
      if (colors.deep !== undefined) uniforms.uDeep.value.set(colors.deep);
    },
    // Removes this mesh from its parent; the caller owns other scene objects.
    dispose() {
      if (disposed) return;
      disposed = true;
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
