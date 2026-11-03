/**
 * One continuous, walkable landmass with optional flat building plateaus.
 *
 * Inject the caller's THREE namespace; this module has no engine import.
 * All x/z coordinates and returned surface heights use the group's parent-local
 * frame. The returned group remains at the identity transform. Move the parent
 * rather than the group if using these queries alongside world-space objects.
 *
 * `outline` is one simple polygon, without holes. `smoothOutline` defaults to
 * true and rounds that coastline; contains/surfaceAt use the resulting outline,
 * exposed in group.userData. Use false when an exact boundary is required.
 * Each plateau is { position: [x, y, z], radius }. Its requested disk is flat.
 * Outside the disks, heights blend continuously between the plateaus. Without
 * plateaus the whole top uses `height` (default 1.2). This does not invent a
 * separate island for each plateau, nor connect independently created terrain.
 *
 * surfaceAt(x,z) returns the actual triangulated top's y, or null outside land.
 * bankWidth is a small optional offshore skirt, never a walkable surface.
 * setColors({groundColor, bankColor}) updates the existing materials and bank
 * color attribute in place. Omitted colors retain their current value. It
 * returns true for an update, or false for an empty call or after disposal.
 * Colors accept the same values as THREE.Color.set; no geometry is rebuilt.
 */
export function createIslandTerrain(THREE, options = {}) {
  if (!THREE?.ShapeUtils?.triangulateShape || !THREE?.BufferGeometry) {
    throw new TypeError('createIslandTerrain requires a THREE namespace.');
  }
  const {
    id = 'landmass', outline: inputOutline, plateaus: inputPlateaus = [],
    height = 1.2, waterLevel = -0.24,
    bankColor = '#ead9b1', groundColor = '#b9d69a',
    gridSize = 0.28, smoothOutline = true, bankWidth = 0.14,
  } = options;
  finite(height, 'height'); finite(waterLevel, 'waterLevel');
  finite(gridSize, 'gridSize'); finite(bankWidth, 'bankWidth');
  if (gridSize <= 0 || bankWidth < 0) throw new RangeError('gridSize must be positive and bankWidth nonnegative.');
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('id must be a nonempty string.');
  if (!Array.isArray(inputPlateaus)) throw new TypeError('plateaus must be an array.');

  const original = cleanOutline(inputOutline);
  assertSimple(original);
  let outline = original;
  let outlineSmoothed = false;
  if (smoothOutline) {
    const perimeter = original.reduce((sum, a, i) => sum + distance(a, original[(i + 1) % original.length]), 0);
    const count = Math.max(48, Math.min(256, Math.ceil(perimeter / Math.max(0.2, gridSize))));
    const curve = new THREE.CatmullRomCurve3(original.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal', 0.25);
    const rounded = curve.getSpacedPoints(count).slice(0, -1).map(p => [p.x, p.z]);
    // Extremely tight concavities can make a spline cross itself. Keep the
    // valid input coast rather than silently making a self-intersecting mesh.
    if (isSimple(rounded) && Math.abs(area(rounded)) > EPS) {
      outline = rounded;
      outlineSmoothed = true;
    }
  }

  // Match the rendered Float32 coastline within its representable precision.
  const coastTolerance = Math.max(EPS, ...outline.flat().map(v => Math.abs(v) * 2 ** -22));
  const inside = (x, z) => Number.isFinite(x) && Number.isFinite(z) && polygonContains(outline, x, z, coastTolerance);
  const plateauMargin = Math.SQRT2 * gridSize * 1.001;
  const plateaus = inputPlateaus.map((p, i) => {
    if (!Array.isArray(p?.position) || p.position.length !== 3) throw new TypeError(`plateaus[${i}].position must be [x,y,z].`);
    p.position.forEach((v, axis) => finite(v, `plateaus[${i}].position[${axis}]`));
    finite(p.radius, `plateaus[${i}].radius`);
    if (p.radius <= 0) throw new RangeError(`plateaus[${i}].radius must be positive.`);
    const [x, y, z] = p.position;
    if (!inside(x, z)) throw new RangeError(`plateaus[${i}] center must lie on the landmass.`);
    return { x, y, z, radius: p.radius, flatRadius: p.radius + plateauMargin };
  });
  for (let i = 0; i < plateaus.length; i++) for (let j = i + 1; j < plateaus.length; j++) {
    const a = plateaus[i], b = plateaus[j];
    if (Math.abs(a.y - b.y) > EPS && Math.hypot(a.x - b.x, a.z - b.z) <= a.flatRadius + b.flatRadius) {
      throw new RangeError('Different-height plateaus overlap or are too close for gridSize; reduce the radii or gridSize, or separate them.');
    }
  }
  const minHeight = plateaus.length ? Math.min(...plateaus.map(p => p.y)) : height;
  if (minHeight <= waterLevel + 0.02) throw new RangeError('Terrain surface heights must be above waterLevel.');

  function heightAtVertex(x, z) {
    if (!plateaus.length) return height;
    const distances = plateaus.map(p => Math.hypot(x - p.x, z - p.z) - p.flatRadius);
    const flat = distances.findIndex(d => d <= 0);
    if (flat !== -1) return plateaus[flat].y;
    // Normalize by the nearest distance before exponentiation for numerical
    // stability, while retaining zero slope at the flat plateau boundary.
    const nearest = Math.min(...distances);
    let weighted = 0, total = 0;
    for (let i = 0; i < plateaus.length; i++) {
      const weight = (nearest / distances[i]) ** 3;
      weighted += plateaus[i].y * weight;
      total += weight;
    }
    return weighted / total;
  }

  const group = new THREE.Group();
  group.name = `Terrain: ${id}`;
  group.userData = {
    islandTerrain: true, landmassId: id, continuousSurface: true,
    coordinateFrame: 'group-parent-local; group must remain identity',
    outline: outline.map(p => [...p]), outlineSmoothed, waterLevel, gridSize,
    plateaus: plateaus.map(p => ({ position: [p.x, p.y, p.z], radius: p.radius })),
  };
  const positions = [], indices = [], vertexMap = new Map(), cells = new Map();
  const bounds = {
    minX: Math.min(...outline.map(p => p[0])), maxX: Math.max(...outline.map(p => p[0])),
    minZ: Math.min(...outline.map(p => p[1])), maxZ: Math.max(...outline.map(p => p[1])),
  };
  const cellX = x => Math.floor((x - bounds.minX) / gridSize);
  const cellZ = z => Math.floor((z - bounds.minZ) / gridSize);
  const nx = Math.ceil((bounds.maxX - bounds.minX) / gridSize);
  const nz = Math.ceil((bounds.maxZ - bounds.minZ) / gridSize);
  if (nx * nz > 1_000_000) throw new RangeError('Terrain grid exceeds one million cells; increase gridSize.');
  function addVertex([x, z]) {
    // Shared grid/coast intersections share a vertex, including intersections
    // obtained in reverse order by two neighboring polygon triangles.
    const key = `${Math.round(x * 1e8)},${Math.round(z * 1e8)}`;
    if (vertexMap.has(key)) return vertexMap.get(key);
    const index = positions.length / 3;
    positions.push(x, heightAtVertex(x, z), z);
    vertexMap.set(key, index);
    return index;
  }
  const baseTriangles = THREE.ShapeUtils.triangulateShape(outline.map(([x, z]) => new THREE.Vector2(x, z)), []);
  if (!baseTriangles.length) throw new Error('The coastline could not be triangulated.');
  for (const triangle of baseTriangles) {
    const trianglePoints = triangle.map(i => outline[i]);
    const ix0 = Math.max(0, cellX(Math.min(...trianglePoints.map(p => p[0]))));
    const ix1 = Math.min(nx - 1, cellX(Math.max(...trianglePoints.map(p => p[0]))));
    const iz0 = Math.max(0, cellZ(Math.min(...trianglePoints.map(p => p[1]))));
    const iz1 = Math.min(nz - 1, cellZ(Math.max(...trianglePoints.map(p => p[1]))));
    for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
      const x0 = bounds.minX + ix * gridSize, z0 = bounds.minZ + iz * gridSize;
      let polygon = clip(trianglePoints, 0, x0, true);
      polygon = clip(polygon, 0, x0 + gridSize, false);
      polygon = clip(polygon, 1, z0, true);
      polygon = clip(polygon, 1, z0 + gridSize, false);
      if (polygon.length < 3) continue;
      const key = `${ix},${iz}`;
      let cell = cells.get(key);
      if (!cell) { cell = []; cells.set(key, cell); }
      for (let k = 1; k < polygon.length - 1; k++) {
        const points = [polygon[0], polygon[k], polygon[k + 1]];
        const signed = cross(points[0], points[1], points[2]);
        if (Math.abs(signed) < 1e-13) continue;
        if (signed > 0) [points[1], points[2]] = [points[2], points[1]];
        const face = points.map(addVertex);
        indices.push(...face); cell.push(face);
      }
    }
  }
  const topGeometry = new THREE.BufferGeometry();
  // Queries read these same Float32 positions used by the renderer.
  topGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  topGeometry.setIndex(indices);
  topGeometry.computeVertexNormals();
  topGeometry.computeBoundingBox(); topGeometry.computeBoundingSphere();
  const topMaterial = new THREE.MeshStandardMaterial({ color: groundColor, roughness: 0.92, metalness: 0 });
  const top = new THREE.Mesh(topGeometry, topMaterial);
  top.name = `${id}: continuous ground`;
  top.receiveShadow = true;
  top.userData = { landmassId: id, terrainRole: 'surface', landscapeSurface: true };
  group.add(top);

  // Use the exact top's clipped outline edges for the bank rim. Original spline
  // points alone would leave tiny vertical gaps where grid cells split an edge.
  const coast = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const cuts = [0];
    for (const [axis, start, count] of [[0, bounds.minX, nx], [1, bounds.minZ, nz]]) {
      const delta = b[axis] - a[axis];
      if (Math.abs(delta) < EPS) continue;
      const lo = Math.max(1, Math.ceil((Math.min(a[axis], b[axis]) - start) / gridSize));
      const hi = Math.min(count - 1, Math.floor((Math.max(a[axis], b[axis]) - start) / gridSize));
      for (let cell = lo; cell <= hi; cell++) {
        const t = (start + cell * gridSize - a[axis]) / delta;
        if (t > EPS && t < 1 - EPS) cuts.push(t);
      }
    }
    cuts.sort((a, b) => a - b);
    cuts.forEach((t, k) => { if (!k || t - cuts[k - 1] > EPS) coast.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); });
  }
  const outer = offsetContour(coast, bankWidth);
  const bankPositions = [], bankColors = [], bankIndices = [];
  const ground = new THREE.Color(groundColor), bank = new THREE.Color(bankColor);
  const rings = [[0, 0], [0.08, 0.1], [0.65, 0.72], [1, 1]];
  for (const [down, outward] of rings) for (let i = 0; i < coast.length; i++) {
    const [x, z] = coast[i], y = heightAtVertex(x, z);
    bankPositions.push(x + (outer[i][0] - x) * outward, y + (waterLevel - y) * down, z + (outer[i][1] - z) * outward);
    const color = ground.clone().lerp(bank, Math.min(1, 0.65 + down * 0.35));
    bankColors.push(color.r, color.g, color.b);
  }
  const n = coast.length;
  for (let row = 0; row < rings.length - 1; row++) for (let i = 0; i < n; i++) {
    const a = row * n + i, b = row * n + (i + 1) % n, c = (row + 1) * n + i, d = (row + 1) * n + (i + 1) % n;
    bankIndices.push(a, c, b, b, c, d);
  }
  const bankGeometry = new THREE.BufferGeometry();
  bankGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bankPositions, 3));
  bankGeometry.setAttribute('color', new THREE.Float32BufferAttribute(bankColors, 3));
  bankGeometry.setIndex(bankIndices); bankGeometry.computeVertexNormals();
  bankGeometry.computeBoundingBox(); bankGeometry.computeBoundingSphere();
  const bankMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide, roughness: 0.92, metalness: 0, flatShading: true });
  const shore = new THREE.Mesh(bankGeometry, bankMaterial);
  shore.name = `${id}: shoreline banks`;
  shore.castShadow = true; shore.receiveShadow = true;
  shore.userData = { landmassId: id, terrainRole: 'bank', continuousBank: true, rimVertexCount: n };
  group.add(shore);
  let disposed = false;
  const attribute = topGeometry.getAttribute('position');
  function surfaceAt(x, z) {
    if (disposed || !inside(x, z)) return null;
    const ix = cellX(x), iz = cellZ(z);
    // Query adjacent cells as well for exact shared coast/grid boundaries.
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      for (const face of cells.get(`${ix + dx},${iz + dz}`) || []) {
        const result = triangleHeight(attribute, face, x, z);
        if (result !== null) return result;
      }
    }
    return null;
  }
  function setColors(colors = {}) {
    if (disposed) return false;
    if (!colors || typeof colors !== 'object' || Array.isArray(colors)) {
      throw new TypeError('setColors requires an object with groundColor and/or bankColor.');
    }
    const updateGround = colors.groundColor !== undefined;
    const updateBank = colors.bankColor !== undefined;
    if (!updateGround && !updateBank) return false;
    if (updateGround) ground.set(colors.groundColor);
    if (updateBank) bank.set(colors.bankColor);
    topMaterial.color.copy(ground);
    const colorAttribute = bankGeometry.getAttribute('color');
    const blended = new THREE.Color();
    for (let row = 0; row < rings.length; row++) {
      blended.copy(ground).lerp(bank, Math.min(1, 0.65 + rings[row][0] * 0.35));
      for (let i = row * n; i < (row + 1) * n; i++) {
        colorAttribute.setXYZ(i, blended.r, blended.g, blended.b);
      }
    }
    colorAttribute.needsUpdate = true;
    return true;
  }
  return {
    group,
    contains(x, z) { return !disposed && inside(x, z); },
    surfaceAt,
    setColors,
    dispose() {
      if (disposed) return;
      disposed = true;
      topGeometry.dispose(); bankGeometry.dispose(); topMaterial.dispose(); bankMaterial.dispose();
      group.clear(); group.removeFromParent(); cells.clear(); vertexMap.clear();
    },
  };
}

const EPS = 1e-8;
function finite(value, label) { if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`); }
function distance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function cross(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function area(points) { return points.reduce((sum, a, i) => { const b = points[(i + 1) % points.length]; return sum + a[0] * b[1] - b[0] * a[1]; }, 0) / 2; }
function cleanOutline(input) {
  if (!Array.isArray(input) || input.length < 3) throw new TypeError('outline must contain at least three [x,z] points.');
  const result = [];
  input.forEach((p, i) => {
    if (!Array.isArray(p) || p.length !== 2) throw new TypeError(`outline[${i}] must be [x,z].`);
    p.forEach((v, axis) => finite(v, `outline[${i}][${axis}]`));
    if (!result.length || distance(p, result[result.length - 1]) > EPS) result.push([...p]);
  });
  if (result.length > 1 && distance(result[0], result[result.length - 1]) <= EPS) result.pop();
  if (result.length < 3 || Math.abs(area(result)) <= EPS) throw new RangeError('outline must enclose a nonzero area.');
  return result;
}
function onSegment(a, b, x, z, tolerance = EPS) {
  const len = distance(a, b);
  return Math.abs(cross(a, b, [x, z])) <= tolerance * Math.max(1, len) && x >= Math.min(a[0], b[0]) - tolerance && x <= Math.max(a[0], b[0]) + tolerance && z >= Math.min(a[1], b[1]) - tolerance && z <= Math.max(a[1], b[1]) + tolerance;
}
function polygonContains(points, x, z, tolerance = EPS) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j], b = points[i];
    if (onSegment(a, b, x, z, tolerance)) return true;
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function segmentsIntersect(a, b, c, d) {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  return ((abC > EPS && abD < -EPS || abC < -EPS && abD > EPS) && (cdA > EPS && cdB < -EPS || cdA < -EPS && cdB > EPS)) ||
    (Math.abs(abC) <= EPS && onSegment(a, b, ...c)) || (Math.abs(abD) <= EPS && onSegment(a, b, ...d)) ||
    (Math.abs(cdA) <= EPS && onSegment(c, d, ...a)) || (Math.abs(cdB) <= EPS && onSegment(c, d, ...b));
}
function isSimple(points) {
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    if (j === i + 1 || i === 0 && j === points.length - 1) continue;
    if (segmentsIntersect(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length])) return false;
  }
  return true;
}
function assertSimple(points) { if (!isSimple(points)) throw new RangeError('outline must be a simple polygon without crossing edges.'); }
function clip(points, axis, boundary, keepGreater) {
  if (!points.length) return [];
  const output = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const da = (a[axis] - boundary) * (keepGreater ? 1 : -1), db = (b[axis] - boundary) * (keepGreater ? 1 : -1);
    if (da >= -EPS) output.push(a);
    if (da > EPS && db < -EPS || da < -EPS && db > EPS) {
      const t = (boundary - a[axis]) / (b[axis] - a[axis]);
      const point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      point[axis] = boundary; output.push(point);
    }
  }
  return output;
}
function offsetContour(points, width) {
  if (!width) return points.map(p => [...p]);
  const sign = area(points) > 0 ? 1 : -1;
  const result = points.map((p, i) => {
    const previous = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length];
    const aLen = distance(previous, p), bLen = distance(p, next);
    const nx = sign * ((p[1] - previous[1]) / aLen + (next[1] - p[1]) / bLen);
    const nz = -sign * ((p[0] - previous[0]) / aLen + (next[0] - p[0]) / bLen);
    const length = Math.hypot(nx, nz);
    return length > EPS ? [p[0] + nx / length * width, p[1] + nz / length * width] : [...p];
  });
  // A tight concave coast may not support the requested skirt width.
  return isSimple(result) ? result : points.map(p => [...p]);
}
function triangleHeight(attribute, [ia, ib, ic], x, z) {
  const ax = attribute.getX(ia), az = attribute.getZ(ia), bx = attribute.getX(ib), bz = attribute.getZ(ib), cx = attribute.getX(ic), cz = attribute.getZ(ic);
  const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
  if (Math.abs(den) < 1e-15) return null;
  const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / den;
  const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / den, w = 1 - u - v;
  if (u < -1e-5 || v < -1e-5 || w < -1e-5) return null;
  return u * attribute.getY(ia) + v * attribute.getY(ib) + w * attribute.getY(ic);
}
