/**
 * Small Three.js bridge/stair builder. Inject the same THREE namespace used by
 * the scene; no package import, renderer, network, or addon is required.
 *
 * Anchors and pointAt() are in the local coordinates of the parent to which
 * group is added. Keep group at its identity transform. Anchors denote the
 * WALKING SURFACE, never the centre of a deck box.
 */
export function createIslandPath(THREE, options = {}) {
  if (!THREE?.Group || !THREE?.BufferGeometry) throw new TypeError('Pass the scene THREE namespace.');
  const { id, fromIslandId, toIslandId } = options;
  for (const [key, value] of Object.entries({ id, fromIslandId, toIslandId })) {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${key} must be a non-empty string.`);
  }
  if (fromIslandId === toIslandId) throw new RangeError('A connection must join two different islands.');
  const vector = (value, label) => {
    const xyz = Array.isArray(value) ? value : [value?.x, value?.y, value?.z];
    if (xyz.length !== 3 || !xyz.every(Number.isFinite)) throw new TypeError(`${label} must contain three finite coordinates.`);
    return new THREE.Vector3(...xyz);
  };
  const start = vector(options.from, 'from');
  const end = vector(options.to, 'to');
  const width = options.width ?? 1.2;
  const stepRise = options.stepRise ?? 0.16;
  const requestedArchHeight = options.archHeight ?? 0.25;
  const requestedKind = options.kind ?? 'bridge';
  if (!['bridge', 'stairs'].includes(requestedKind)) throw new RangeError('kind must be bridge or stairs.');
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('width must be positive.');
  if (!Number.isFinite(stepRise) || stepRise <= 0 || stepRise > 0.2) throw new RangeError('stepRise must be greater than 0 and at most 0.2.');
  if (!Number.isFinite(requestedArchHeight) || requestedArchHeight < 0) throw new RangeError('archHeight must be non-negative.');
  const length = Math.hypot(end.x - start.x, end.z - start.z);
  if (length < 0.01) throw new RangeError('Anchors need a horizontal separation of at least 0.01.');
  const rise = end.y - start.y;
  // A small bridge must not turn the default arch into a steep hump.
  const archHeight = Math.min(requestedArchHeight, length * 0.1);
  // Height changes use real treads and end landings, even if bridge was requested.
  const kind = Math.abs(rise) > 1e-7 ? 'stairs' : requestedKind;
  const stepCount = kind === 'stairs' ? Math.ceil(Math.abs(rise) / stepRise) : 0;
  const landing = Math.min(width * 0.6, length * 0.2);
  const flightLength = length - 2 * landing;
  const treadDepth = stepCount ? flightLength / stepCount : length;
  const minTreadDepth = Math.min(0.24, width * 0.24);
  if (stepCount && treadDepth < minTreadDepth) {
    throw new RangeError(`Stairs are too short: ${stepCount} treads require more horizontal run (at least ${minTreadDepth.toFixed(2)} per tread). Move the anchors farther apart or add a landing and another path.`);
  }
  const forward = new THREE.Vector3(end.x - start.x, 0, end.z - start.z).normalize();
  const side = new THREE.Vector3(-forward.z, 0, forward.x);
  const deckThickness = Math.min(0.12, width * 0.14);
  const railHeight = Math.max(0.62, width * 0.58);
  const railInset = Math.min(0.08, width * 0.12);
  const group = new THREE.Group();
  group.name = `island-path:${id}`;
  const routeData = { id, pathId: id, fromIslandId, toIslandId, kind, requestedKind };
  group.userData = {
    ...routeData, isIslandPath: true, width, stepCount, archHeight: kind === 'bridge' ? archHeight : 0,
    stepRise: stepCount ? Math.abs(rise) / stepCount : 0,
    treadDepth, anchors: { from: start.toArray(), to: end.toArray() },
    coordinateSpace: 'parent-local', surfaceAnchor: true,
  };
  const colors = { deck: 0xb98b59, rail: 0x76523c, post: 0x8a6142, ...options.colors };
  const makeMaterial = color => new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, flatShading: true });
  const deckMaterial = makeMaterial(colors.deck);
  const alternateDeckMaterial = deckMaterial.clone();
  alternateDeckMaterial.color.multiplyScalar(0.96);
  const railMaterial = makeMaterial(colors.rail);
  const postMaterial = makeMaterial(colors.post);
  const topTriangles = [];
  const at = (distance, y, lateral = 0) => new THREE.Vector3(
    start.x + forward.x * distance + side.x * lateral,
    y,
    start.z + forward.z * distance + side.z * lateral,
  );
  const addMesh = (geometry, material, role, extra = {}) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${id}:${role}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { ...routeData, pathRole: role, ...extra };
    group.add(mesh);
    return mesh;
  };
  // A slab's upper vertices ARE the route. Unlike rotated boxes, its ends do
  // not poke above/below their surface anchors or leave gaps between slopes.
  const slab = (a, b, ya, yb, thickness, role, material, extra = {}) => {
    const top = [at(a, ya, -width / 2), at(a, ya, width / 2), at(b, yb, width / 2), at(b, yb, -width / 2)];
    const vertices = [...top, ...top.map(v => v.clone().add(new THREE.Vector3(0, -thickness, 0)))];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flatMap(v => v.toArray()), 3));
    geometry.setIndex([
      0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
      0, 4, 5, 0, 5, 1, 3, 2, 6, 3, 6, 7,
      0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2,
    ]);
    geometry.computeVertexNormals();
    const position = geometry.getAttribute('position');
    const v = index => new THREE.Vector3().fromBufferAttribute(position, index);
    topTriangles.push([v(0), v(1), v(2)], [v(0), v(2), v(3)]);
    return addMesh(geometry, material, role, { surface: true, ...extra });
  };
  const bridgeNodes = [];
  const treads = [];
  const risers = [];
  if (kind === 'bridge') {
    const count = Math.max(8, Math.ceil(length / 0.3));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      bridgeNodes.push({ s: t * length, y: i === 0 ? start.y : i === count ? end.y : start.y + Math.sin(Math.PI * t) * archHeight });
    }
    for (let i = 0; i < count; i++) {
      const a = bridgeNodes[i], b = bridgeNodes[i + 1];
      slab(a.s, b.s, a.y, b.y, deckThickness, 'deck', i % 2 ? alternateDeckMaterial : deckMaterial, { segment: i });
    }
  } else if (!stepCount) {
    treads.push({ a: 0, b: length, y: start.y });
  } else {
    treads.push({ a: 0, b: landing, y: start.y });
    for (let i = 0; i < stepCount; i++) {
      const s = landing + i * treadDepth;
      const previousY = start.y + rise * i / stepCount;
      const y = i === stepCount - 1 ? end.y : start.y + rise * (i + 1) / stepCount;
      treads.push({ a: s, b: s + treadDepth, y });
      risers.push({ s, previousY, y });
    }
    treads.push({ a: length - landing, b: length, y: end.y });
  }
  for (let i = 0; i < treads.length; i++) {
    const tread = treads[i];
    slab(tread.a, tread.b, tread.y, tread.y, deckThickness, 'tread', i % 2 ? alternateDeckMaterial : deckMaterial, { tread: i, topY: tread.y });
  }
  for (let i = 0; i < risers.length; i++) {
    const { s, previousY, y } = risers[i];
    // Riser thickness occupies ONLY the higher tread side. It cannot create a
    // lip on the lower walking surface, and closes the gap below each tread.
    const depth = Math.min(0.04, treadDepth * 0.2);
    const a = rise > 0 ? s : s - depth;
    const b = rise > 0 ? s + depth : s;
    const high = Math.max(previousY, y), low = Math.min(previousY, y);
    slab(a, b, high, high, high - low + deckThickness, 'riser', deckMaterial, { riser: i, bottomY: low, topY: high });
  }
  // A small, level toe overlaps each island. It also keeps a raycast/contact
  // at the exact anchor inside a real polygon despite Float32 edge rounding.
  const toe = Math.min(0.035, length * 0.04);
  slab(-toe, toe, start.y, start.y, deckThickness, 'landing', deckMaterial, { end: 'from' });
  slab(length - toe, length + toe, end.y, end.y, deckThickness, 'landing', deckMaterial, { end: 'to' });
  const bridgeY = s => {
    const f = s / length * (bridgeNodes.length - 1);
    const index = Math.min(bridgeNodes.length - 2, Math.floor(f));
    const a = bridgeNodes[index], b = bridgeNodes[index + 1];
    return a.y + (b.y - a.y) * (s - a.s) / (b.s - a.s);
  };
  const actualSeamY = s => {
    const origin = at(s, Math.max(start.y, end.y) + archHeight + 2);
    const ray = new THREE.Ray(origin, new THREE.Vector3(0, -1, 0));
    const hit = new THREE.Vector3();
    let y = -Infinity;
    for (const [a, b, c] of topTriangles) {
      if (ray.intersectTriangle(a, b, c, true, hit)) y = Math.max(y, hit.y);
    }
    return y;
  };
  const surfaceY = s => {
    if (s <= 0) return start.y;
    if (s >= length) return end.y;
    if (kind === 'bridge') return bridgeY(s);
    if (!stepCount || s < landing) return start.y;
    if (s >= length - landing) return end.y;
    const q = (s - landing) / treadDepth;
    // At a seam choose its higher surface; elsewhere use the tread's exact
    // top. Never interpolate a diagonal through a stair's solid front face.
    const nearest = Math.round(q);
    // GPU vertices use Float32. Only at a step seam, sample those same real
    // triangles so rounding cannot put a walker on the wrong side of a riser.
    if (Math.abs(q - nearest) * treadDepth < 1e-5) {
      const meshY = actualSeamY(s);
      if (Number.isFinite(meshY)) return meshY;
    }
    const seam = Math.abs(q - nearest) < 1e-9;
    const step = rise > 0 ? (seam ? nearest + 1 : Math.floor(q) + 1) : (seam ? nearest : Math.floor(q) + 1);
    return start.y + rise * Math.min(stepCount, Math.max(0, step)) / stepCount;
  };
  const pointAt = t => {
    if (!Number.isFinite(t)) throw new TypeError('pointAt(t) needs a finite number.');
    if (t <= 0) return start.clone();
    if (t >= 1) return end.clone();
    const s = t * length;
    return at(s, surfaceY(s));
  };
  const railNodes = kind === 'bridge' ? bridgeNodes : stepCount ? [
    { s: 0, y: start.y }, { s: landing, y: start.y },
    { s: length - landing, y: end.y }, { s: length, y: end.y },
  ] : [{ s: 0, y: start.y }, { s: length, y: end.y }];
  const railY = s => {
    const index = railNodes.findIndex((p, i) => i < railNodes.length - 1 && s >= p.s && s <= railNodes[i + 1].s);
    const a = railNodes[Math.max(0, index)], b = railNodes[Math.max(0, index) + 1];
    return a.y + (b.y - a.y) * (s - a.s) / (b.s - a.s) + railHeight;
  };
  const rod = (a, b, radius, material, role) => {
    const delta = b.clone().sub(a);
    const mesh = addMesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 6), material, role);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    mesh.userData.endpoints = [a.toArray(), b.toArray()];
  };
  for (const sign of [-1, 1]) {
    const lateral = sign * (width / 2 - railInset);
    for (let i = 0; i < railNodes.length - 1; i++) {
      const a = railNodes[i], b = railNodes[i + 1];
      rod(at(a.s, a.y + railHeight, lateral), at(b.s, b.y + railHeight, lateral), Math.min(0.045, width * 0.05), railMaterial, 'rail');
    }
    const postCount = Math.max(1, Math.ceil(length / 0.8));
    for (let i = 0; i <= postCount; i++) {
      const s = length * i / postCount;
      rod(at(s, surfaceY(s) - 0.025, lateral), at(s, railY(s), lateral), Math.min(0.055, width * 0.06), postMaterial, 'post');
    }
  }
  group.updateMatrixWorld(true);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    const materials = new Set([deckMaterial, alternateDeckMaterial, railMaterial, postMaterial]);
    group.traverse(object => {
      object.geometry?.dispose();
      const values = Array.isArray(object.material) ? object.material : [object.material];
      values.filter(Boolean).forEach(material => materials.add(material));
    });
    materials.forEach(material => material.dispose());
    group.removeFromParent();
    group.clear();
    group.userData.disposed = true;
  };
  return { group, pointAt, start: start.clone(), end: end.clone(), id, fromIslandId, toIslandId, kind, dispose };
}

/** Validate the undirected PLANNING graph. This does not prove scene meshes exist. */
export function validateIslandConnections(islandIds, connections, rootId = islandIds?.[0]) {
  const errors = [], warnings = [];
  const report = (code, message, extra = {}) => errors.push({ code, message, ...extra });
  if (!Array.isArray(islandIds) || !Array.isArray(connections)) throw new TypeError('islandIds and connections must be arrays.');
  const ids = new Set();
  for (const id of islandIds) {
    if (typeof id !== 'string' || !id.trim()) report('INVALID_ISLAND_ID', 'Each island needs a non-empty string id.');
    else if (ids.has(id)) report('DUPLICATE_ISLAND_ID', `Duplicate island id: ${id}`, { islandId: id });
    else ids.add(id);
  }
  if (!ids.size) report('NO_ISLANDS', 'At least one island is required.');
  if (!ids.has(rootId)) report('UNKNOWN_ROOT', `Unknown root island: ${rootId}`, { islandId: rootId });
  const graph = new Map([...ids].map(id => [id, new Set()]));
  const routeIds = new Set(), pairs = new Set();
  for (const [index, connection] of connections.entries()) {
    const { id, fromIslandId: from, toIslandId: to } = connection ?? {};
    if (typeof id !== 'string' || !id.trim()) report('INVALID_PATH_ID', `Connection ${index} needs an id.`, { index });
    else if (routeIds.has(id)) report('DUPLICATE_PATH_ID', `Duplicate path id: ${id}`, { pathId: id });
    else routeIds.add(id);
    const unknown = [from, to].filter(id => !ids.has(id));
    for (const unknownId of new Set(unknown)) report('UNKNOWN_ISLAND', `Connection ${id ?? index} names unknown island: ${unknownId}`, { pathId: id, islandId: unknownId });
    if (from === to) report('SELF_CONNECTION', `Connection ${id ?? index} joins an island to itself.`, { pathId: id });
    if (unknown.length || from === to) continue;
    const pair = JSON.stringify([from, to].sort());
    if (pairs.has(pair)) warnings.push({ code: 'PARALLEL_CONNECTION', message: `More than one path joins ${from} and ${to}.`, pathId: id });
    pairs.add(pair);
    graph.get(from).add(to);
    graph.get(to).add(from);
  }
  const reachable = new Set(ids.has(rootId) ? [rootId] : []);
  const queue = [...reachable];
  for (let i = 0; i < queue.length; i++) {
    for (const id of graph.get(queue[i])) if (!reachable.has(id)) { reachable.add(id); queue.push(id); }
  }
  const disconnectedIslandIds = [...ids].filter(id => !reachable.has(id));
  for (const id of disconnectedIslandIds) report('DISCONNECTED_ISLAND', `Island ${id} cannot be reached from ${rootId}.`, { islandId: id });
  return {
    valid: errors.length === 0, rootId, islandCount: ids.size, connectionCount: connections.length,
    reachableIslandIds: [...reachable], disconnectedIslandIds, errors, warnings,
  };
}
