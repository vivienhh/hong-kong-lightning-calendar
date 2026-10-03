const LIGHTNING_DATA_PATH = "./data/daily_HK_LGTG_ALL.csv";

const YEAR_START = 2005;
const YEAR_END = 2026;

const HK_CENTER = [114.15, 22.34];

const PARTIAL_YEARS = {
  2005: "PARTIAL · STARTS 21 JUN",
  2026: "PARTIAL / YTD"
};

let THREE = null;

let lightningRecords = [];
let annualStats = [];

let renderer = null;
let scene = null;
let camera = null;
let temporalSphere = null;

let yearObjects = [];
let pickMeshes = [];

let selectedYear = null;
let hoveredYear = null;

let raycaster = null;
let mouse = null;

let renderQueued = false;
let mapSyncQueued = false;
let controlsAttached = false;

const DEFAULT_ORBIT = {
  azimuth: 0,
  polar: 0.07,
  distance: 7.4
};

const orbit = {
  ...DEFAULT_ORBIT
};

const pointer = {
  down: false,
  id: null,
  x: 0,
  y: 0,
  moved: false
};


/* =========================================================
   DATA
   ========================================================= */

async function loadText(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(
      `Could not load ${path}: ${response.status}`
    );
  }

  return response.text();
}


function parseLightningData(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  /*
   * CSV:
   * line 1 = Chinese title
   * line 2 = English title
   * line 3 = header
   * line 4 onwards = data
   */

  lightningRecords = lines
    .slice(3)
    .map(line => {
      const [
        year,
        month,
        day,
        value,
        completeness
      ] = line.split(",");

      return {
        year: Number(year),
        month: Number(month),
        day: Number(day),
        value: Number(value),
        completeness: completeness?.trim() || ""
      };
    })
    .filter(record =>
      Number.isFinite(record.year) &&
      Number.isFinite(record.month) &&
      Number.isFinite(record.day) &&
      Number.isFinite(record.value)
    );

  console.log(
    "Lightning records loaded:",
    lightningRecords.length
  );
}


function buildAnnualStats() {
  annualStats = [];

  for (
    let year = YEAR_START;
    year <= YEAR_END;
    year += 1
  ) {
    const records = lightningRecords.filter(
      record => record.year === year
    );

    const total = records.reduce(
      (sum, record) =>
        sum + record.value,
      0
    );

    const activeDays = records.filter(
      record => record.value > 0
    ).length;

    let peakRecord = null;

    records.forEach(record => {
      if (
        !peakRecord ||
        record.value > peakRecord.value
      ) {
        peakRecord = record;
      }
    });

    annualStats.push({
      year,
      total,
      activeDays,
      recordCount: records.length,

      peakValue:
        peakRecord?.value ?? 0,

      peakDate:
        peakRecord
          ? `${peakRecord.year}-${String(
              peakRecord.month
            ).padStart(2, "0")}-${String(
              peakRecord.day
            ).padStart(2, "0")}`
          : "—",

      complete:
        year >= 2006 &&
        year <= 2025,

      partialLabel:
        PARTIAL_YEARS[year] || ""
    });
  }


  /*
   * Use logarithmic normalisation so
   * one extreme year does not dominate
   * all the others visually.
   */

  const logs = annualStats.map(
    item =>
      Math.log1p(item.total)
  );

  const minLog =
    Math.min(...logs);

  const maxLog =
    Math.max(...logs);


  annualStats.forEach(item => {
    const logValue =
      Math.log1p(item.total);

    item.normalised =
      maxLog === minLog
        ? 0.5
        : (
            logValue -
            minLog
          ) /
          (
            maxLog -
            minLog
          );
  });


  console.log(
    "Annual lightning statistics:",
    annualStats
  );
}


/* =========================================================
   THREE.JS
   ========================================================= */

function createRenderer() {
  const container =
    map.getContainer();


  document
    .getElementById(
      "temporal-sphere-canvas"
    )
    ?.remove();


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.id =
    "temporal-sphere-canvas";


  Object.assign(
    canvas.style,
    {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "7",
      pointerEvents: "none"
    }
  );


  container.appendChild(
    canvas
  );


  renderer =
    new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference:
        "high-performance"
    });


  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      1.5
    )
  );


  renderer.setClearColor(
    0x000000,
    0
  );


  if (
    "outputColorSpace" in renderer &&
    THREE.SRGBColorSpace
  ) {
    renderer.outputColorSpace =
      THREE.SRGBColorSpace;
  }
}


function createScene() {
  scene =
    new THREE.Scene();


  camera =
    new THREE.PerspectiveCamera(
      38,
      1,
      0.1,
      100
    );


  raycaster =
    new THREE.Raycaster();


  mouse =
    new THREE.Vector2();


  temporalSphere =
    new THREE.Group();


  scene.add(
    temporalSphere
  );


  updateCamera();
}


/* =========================================================
   GLOW TEXTURE
   ========================================================= */

function makeGlowTexture() {
  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width = 256;
  canvas.height = 256;


  const context =
    canvas.getContext(
      "2d"
    );


  const gradient =
    context.createRadialGradient(
      128,
      128,
      0,

      128,
      128,
      128
    );


  gradient.addColorStop(
    0,
    "rgba(255,255,255,1)"
  );

  gradient.addColorStop(
    0.10,
    "rgba(225,247,255,0.92)"
  );

  gradient.addColorStop(
    0.25,
    "rgba(125,225,255,0.48)"
  );

  gradient.addColorStop(
    0.50,
    "rgba(170,125,255,0.18)"
  );

  gradient.addColorStop(
    0.75,
    "rgba(115,70,255,0.055)"
  );

  gradient.addColorStop(
    1,
    "rgba(0,0,0,0)"
  );


  context.fillStyle =
    gradient;


  context.fillRect(
    0,
    0,
    256,
    256
  );


  const texture =
    new THREE.CanvasTexture(
      canvas
    );


  texture.needsUpdate =
    true;


  return texture;
}


/* =========================================================
   YEAR COLOUR
   ========================================================= */

function colorForYear(index) {
  const t =
    index /
    Math.max(
      1,
      annualStats.length - 1
    );


  /*
   * Time moves through:
   * cyan → blue → violet → pink.
   *
   * Colour = WHEN
   * brightness/thickness = HOW MUCH
   */

  const hue =
    188 +
    t * 132;


  const color =
    new THREE.Color();


  color.setHSL(
    hue / 360,
    0.88,
    0.68
  );


  return color;
}


/* =========================================================
   TEMPORAL SPHERE
   ========================================================= */

function clearTemporalSphere() {
  if (!temporalSphere) {
    return;
  }


  temporalSphere.traverse(
    object => {
      if (
        object.geometry
      ) {
        object.geometry.dispose?.();
      }


      if (
        object.material
      ) {
        if (
          Array.isArray(
            object.material
          )
        ) {
          object.material
            .forEach(material =>
              material.dispose?.()
            );
        }

        else {
          object.material.dispose?.();
        }
      }
    }
  );


  temporalSphere.clear();


  yearObjects = [];
  pickMeshes = [];
}


function buildTemporalSphere() {
  clearTemporalSphere();


  const glowTexture =
    makeGlowTexture();


  /*
   * Main atmospheric glow.
   *
   * In top view all annual rings overlap,
   * so this helps them read as one large
   * luminous sphere / light spot.
   */

  const atmosphere =
    new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xa5e5ff,
        transparent: true,
        opacity: 0.16,
        blending:
          THREE.AdditiveBlending,
        depthWrite: false
      })
    );


  atmosphere.scale.set(
    6.8,
    6.8,
    1
  );


  temporalSphere.add(
    atmosphere
  );


  const innerGlow =
    new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xdab4ff,
        transparent: true,
        opacity: 0.10,
        blending:
          THREE.AdditiveBlending,
        depthWrite: false
      })
    );


  innerGlow.scale.set(
    4.5,
    4.5,
    1
  );


  temporalSphere.add(
    innerGlow
  );


  const totalYears =
    annualStats.length;


  annualStats.forEach(
    (
      stats,
      index
    ) => {
      const position =
        index /
        Math.max(
          1,
          totalYears - 1
        );


      /*
       * Oldest year at bottom,
       * newest year at top.
       */

      const y =
        -1.78 +
        position * 3.56;


      /*
       * Slight radius change creates
       * a rounded temporal volume.
       *
       * Radius itself is NOT the data.
       */

      const middleDistance =
        Math.abs(
          position - 0.5
        ) * 2;


      const radius =
        2.00 +
        (
          1 -
          middleDistance
        ) *
          0.28;


      const intensity =
        Math.pow(
          stats.normalised,
          0.78
        );


      const color =
        colorForYear(
          index
        );


      const group =
        new THREE.Group();


      group.position.y =
        y;


      /*
       * Tiny rotations add spatial
       * depth without destroying
       * chronological order.
       */

      group.rotation.z =
        Math.sin(
          index * 1.31
        ) *
        0.020;


      group.rotation.x =
        Math.cos(
          index * 1.07
        ) *
        0.015;


      group.userData.stats =
        stats;


      /*
       * Main annual ring.
       */

      const tubeRadius =
        0.018 +
        intensity *
          0.050;


      const coreGeometry =
        new THREE.TorusGeometry(
          radius,
          tubeRadius,
          8,
          128
        );


      const coreOpacity =
        stats.complete
          ? (
              0.28 +
              intensity *
                0.67
            )
          : (
              0.10 +
              intensity *
                0.32
            );


      const coreMaterial =
        new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: coreOpacity,
          blending:
            THREE.AdditiveBlending,
          depthWrite: false
        });


      const core =
        new THREE.Mesh(
          coreGeometry,
          coreMaterial
        );


      /*
       * TorusGeometry initially lies
       * in XY. Rotate it so each year
       * is parallel to the map plane.
       */

      core.rotation.x =
        Math.PI / 2;


      core.userData = {
        stats,
        role: "core",
        baseOpacity:
          coreOpacity
      };


      group.add(
        core
      );


      /*
       * Soft halo ring.
       */

      const haloGeometry =
        new THREE.TorusGeometry(
          radius,
          tubeRadius * 3.4,
          8,
          128
        );


      const haloOpacity =
        stats.complete
          ? (
              0.018 +
              intensity *
                0.105
            )
          : (
              0.006 +
              intensity *
                0.040
            );


      const haloMaterial =
        new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: haloOpacity,
          blending:
            THREE.AdditiveBlending,
          depthWrite: false
        });


      const halo =
        new THREE.Mesh(
          haloGeometry,
          haloMaterial
        );


      halo.rotation.x =
        Math.PI / 2;


      halo.userData = {
        stats,
        role: "halo",
        baseOpacity:
          haloOpacity
      };


      group.add(
        halo
      );


      /*
       * Invisible thick ring used
       * only for mouse selection.
       */

      const pickGeometry =
        new THREE.TorusGeometry(
          radius,
          0.13,
          6,
          96
        );


      const pickMaterial =
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false
        });


      const pick =
        new THREE.Mesh(
          pickGeometry,
          pickMaterial
        );


      pick.rotation.x =
        Math.PI / 2;


      pick.userData = {
        stats,
        role: "pick"
      };


      group.add(
        pick
      );


      pickMeshes.push(
        pick
      );


      yearObjects.push({
        group,
        core,
        halo,
        pick,
        stats
      });


      temporalSphere.add(
        group
      );
    }
  );


  /*
   * Subtle particle atmosphere.
   * Decorative only.
   */

  const particleCount =
    650;


  const positions =
    new Float32Array(
      particleCount * 3
    );


  let seed =
    3917;


  function random() {
    seed =
      (
        seed *
          1664525 +
        1013904223
      ) %
      4294967296;


    return (
      seed /
      4294967296
    );
  }


  for (
    let i = 0;
    i < particleCount;
    i += 1
  ) {
    const angle =
      random() *
      Math.PI *
      2;


    const radial =
      1.45 +
      random() *
      1.18;


    const y =
      -2.0 +
      random() *
      4.0;


    positions[
      i * 3
    ] =
      Math.cos(angle) *
      radial;


    positions[
      i * 3 + 1
    ] =
      y;


    positions[
      i * 3 + 2
    ] =
      Math.sin(angle) *
      radial;
  }


  const particleGeometry =
    new THREE.BufferGeometry();


  particleGeometry.setAttribute(
    "position",

    new THREE.BufferAttribute(
      positions,
      3
    )
  );


  const particleMaterial =
    new THREE.PointsMaterial({
      color: 0xd2edff,
      size: 0.018,
      transparent: true,
      opacity: 0.15,
      blending:
        THREE.AdditiveBlending,
      depthWrite: false
    });


  const particles =
    new THREE.Points(
      particleGeometry,
      particleMaterial
    );


  temporalSphere.add(
    particles
  );


  updateYearAppearance();
}


/* =========================================================
   CAMERA
   ========================================================= */

function updateCamera() {
  if (!camera) {
    return;
  }


  const {
    azimuth,
    polar,
    distance
  } = orbit;


  camera.position.set(
    distance *
      Math.sin(polar) *
      Math.sin(azimuth),

    distance *
      Math.cos(polar),

    distance *
      Math.sin(polar) *
      Math.cos(azimuth)
  );


  camera.lookAt(
    0,
    0,
    0
  );


  scheduleRender();
}


/* =========================================================
   MAP CAMERA
   ========================================================= */

function syncMapToOrbit() {
  if (
    !map ||
    !map.loaded()
  ) {
    return;
  }


  const minPolar =
    0.07;


  const maxPolar =
    1.25;


  const progress =
    Math.min(
      1,

      Math.max(
        0,

        (
          orbit.polar -
          minPolar
        ) /
        (
          maxPolar -
          minPolar
        )
      )
    );


  /*
   * Top view:
   * pitch ≈ 0.
   *
   * As viewer drags downward,
   * Hong Kong becomes a flat stage.
   */

  const pitch =
    progress * 62;


  const bearing =
    -(
      orbit.azimuth *
      180 /
      Math.PI
    );


  map.jumpTo({
    pitch,
    bearing
  });
}


function scheduleMapSync() {
  if (mapSyncQueued) {
    return;
  }


  mapSyncQueued =
    true;


  requestAnimationFrame(
    () => {
      mapSyncQueued =
        false;

      syncMapToOrbit();
    }
  );
}


/* =========================================================
   RENDER
   ========================================================= */

function resizeRenderer() {
  if (
    !renderer ||
    !camera
  ) {
    return;
  }


  const container =
    map.getContainer();


  const width =
    Math.max(
      1,
      container.clientWidth
    );


  const height =
    Math.max(
      1,
      container.clientHeight
    );


  renderer.setSize(
    width,
    height,
    false
  );


  camera.aspect =
    width / height;


  camera.updateProjectionMatrix();


  scheduleRender();
}


function scheduleRender() {
  if (
    renderQueued ||
    !renderer ||
    !scene ||
    !camera
  ) {
    return;
  }


  renderQueued =
    true;


  requestAnimationFrame(
    () => {
      renderQueued =
        false;


      renderer.render(
        scene,
        camera
      );
    }
  );
}


/* =========================================================
   INFORMATION PANEL
   ========================================================= */

function ensureInterface() {
  const container =
    map.getContainer();


  document
    .getElementById(
      "temporal-sphere-info"
    )
    ?.remove();


  document
    .getElementById(
      "temporal-sphere-hint"
    )
    ?.remove();


  if (
    !document.getElementById(
      "temporal-sphere-style"
    )
  ) {
    const style =
      document.createElement(
        "style"
      );


    style.id =
      "temporal-sphere-style";


    style.textContent = `
      #temporal-sphere-info {
        position: absolute;
        top: 32px;
        right: 72px;
        width: 230px;
        z-index: 12;
        pointer-events: none;
        color: #f4f5ff;
        font-family: Arial, Helvetica, sans-serif;
      }

      #temporal-sphere-info .eyebrow {
        margin-bottom: 10px;
        font-size: 10px;
        letter-spacing: 0.22em;
        color: rgba(200, 220, 255, 0.58);
      }

      #temporal-sphere-info .year {
        font-size: 34px;
        line-height: 1;
        font-weight: 650;
        letter-spacing: -0.03em;
      }

      #temporal-sphere-info .count {
        margin-top: 9px;
        font-size: 13px;
        line-height: 1.5;
        color: rgba(225, 231, 255, 0.88);
      }

      #temporal-sphere-info .meta {
        margin-top: 12px;
        font-size: 10px;
        line-height: 1.65;
        letter-spacing: 0.08em;
        color: rgba(190, 201, 231, 0.60);
      }

      #temporal-sphere-hint {
        position: absolute;
        left: 50%;
        bottom: 30px;
        transform: translateX(-50%);
        z-index: 12;
        pointer-events: none;

        padding: 9px 13px;
        border:
          1px solid rgba(
            190,
            210,
            255,
            0.17
          );

        border-radius: 999px;

        background:
          rgba(
            3,
            5,
            11,
            0.55
          );

        backdrop-filter:
          blur(8px);

        color:
          rgba(
            223,
            231,
            255,
            0.72
          );

        font-family:
          Arial,
          Helvetica,
          sans-serif;

        font-size: 9px;

        letter-spacing:
          0.16em;

        white-space:
          nowrap;
      }
    `;


    document.head.appendChild(
      style
    );
  }


  const info =
    document.createElement(
      "div"
    );


  info.id =
    "temporal-sphere-info";


  info.innerHTML = `
    <div class="eyebrow">
      TEMPORAL LIGHT FIELD
    </div>

    <div
      class="year"
      id="sphere-year"
    >
      2005–2026
    </div>

    <div
      class="count"
      id="sphere-count"
    >
      22 annual slices
    </div>

    <div
      class="meta"
      id="sphere-meta"
    >
      DRAG TO ROTATE<br>
      SCROLL TO ZOOM<br>
      2005 PARTIAL · 2026 YTD
    </div>
  `;


  container.appendChild(
    info
  );


  const hint =
    document.createElement(
      "div"
    );


  hint.id =
    "temporal-sphere-hint";


  hint.textContent =
    "DRAG TO REVEAL THE TIME SLICES";


  container.appendChild(
    hint
  );


  updateInfoPanel();
}


function updateInfoPanel() {
  const yearElement =
    document.getElementById(
      "sphere-year"
    );


  const countElement =
    document.getElementById(
      "sphere-count"
    );


  const metaElement =
    document.getElementById(
      "sphere-meta"
    );


  if (
    !yearElement ||
    !countElement ||
    !metaElement
  ) {
    return;
  }


  const activeYear =
    selectedYear ??
    hoveredYear;


  if (
    activeYear === null
  ) {
    yearElement.textContent =
      "2005–2026";


    countElement.textContent =
      "22 annual slices";


    metaElement.innerHTML =
      "DRAG TO ROTATE<br>" +
      "SCROLL TO ZOOM<br>" +
      "2005 PARTIAL · 2026 YTD";


    return;
  }


  const stats =
    annualStats.find(
      item =>
        item.year ===
        activeYear
    );


  if (!stats) {
    return;
  }


  yearElement.textContent =
    String(
      stats.year
    );


  countElement.innerHTML =
    `<strong>${stats.total.toLocaleString()}</strong> lightning strikes`;


  metaElement.innerHTML =
    `${stats.activeDays.toLocaleString()} ACTIVE DAYS<br>` +
    `PEAK ${stats.peakValue.toLocaleString()} · ${stats.peakDate}<br>` +
    (
      stats.complete
        ? "COMPLETE YEAR"
        : stats.partialLabel
    );
}


/* =========================================================
   YEAR HIGHLIGHT
   ========================================================= */

function updateYearAppearance() {
  yearObjects.forEach(
    item => {
      const isSelected =
        selectedYear ===
        item.stats.year;


      const isHovered =
        hoveredYear ===
        item.stats.year;


      if (
        selectedYear !== null
      ) {
        item.core.material.opacity =
          isSelected
            ? 1
            : 0.045;


        item.halo.material.opacity =
          isSelected
            ? 0.26
            : 0.005;


        item.group.scale.setScalar(
          isSelected
            ? 1.025
            : 1
        );
      }

      else {
        item.core.material.opacity =
          isHovered
            ? Math.min(
                1,

                item.core
                  .userData
                  .baseOpacity *
                  1.70
              )
            : item.core
                .userData
                .baseOpacity;


        item.halo.material.opacity =
          isHovered
            ? Math.min(
                0.30,

                item.halo
                  .userData
                  .baseOpacity *
                  2.25
              )
            : item.halo
                .userData
                .baseOpacity;


        item.group.scale.setScalar(
          isHovered
            ? 1.018
            : 1
        );
      }
    }
  );


  updateInfoPanel();
  scheduleRender();
}


/* =========================================================
   RAYCAST
   ========================================================= */

function setMouseFromEvent(
  event
) {
  const container =
    map.getContainer();


  const rect =
    container.getBoundingClientRect();


  mouse.x =
    (
      (
        event.clientX -
        rect.left
      ) /
      rect.width
    ) *
      2 -
    1;


  mouse.y =
    -(
      (
        event.clientY -
        rect.top
      ) /
      rect.height
    ) *
      2 +
    1;
}


function yearFromPointer(
  event
) {
  if (
    !camera ||
    !raycaster
  ) {
    return null;
  }


  setMouseFromEvent(
    event
  );


  raycaster.setFromCamera(
    mouse,
    camera
  );


  const hits =
    raycaster.intersectObjects(
      pickMeshes,
      false
    );


  if (!hits.length) {
    return null;
  }


  return (
    hits[0]
      .object
      .userData
      .stats
      ?.year ??
    null
  );
}


/* =========================================================
   ORBIT CONTROL
   ========================================================= */

function shouldIgnorePointer(
  event
) {
  const target =
    event.target instanceof Element
      ? event.target
      : null;


  return Boolean(
    target?.closest(
      "button, a, .maplibregl-ctrl"
    )
  );
}


function attachOrbitControls() {
  if (controlsAttached) {
    return;
  }


  controlsAttached =
    true;


  const container =
    map.getContainer();


  container.style.touchAction =
    "none";


  /*
   * Our own drag controls rotate both
   * the temporal object and the map.
   */

  map.dragPan?.disable();
  map.dragRotate?.disable();
  map.scrollZoom?.disable();
  map.doubleClickZoom?.disable();
  map.keyboard?.disable();
  map.touchZoomRotate?.disable();


  container.addEventListener(
    "pointerdown",
    event => {
      if (
        shouldIgnorePointer(
          event
        )
      ) {
        return;
      }


      pointer.down =
        true;


      pointer.id =
        event.pointerId;


      pointer.x =
        event.clientX;


      pointer.y =
        event.clientY;


      pointer.moved =
        false;


      container.setPointerCapture?.(
        event.pointerId
      );


      container.style.cursor =
        "grabbing";
    }
  );


  container.addEventListener(
    "pointermove",
    event => {
      if (
        !pointer.down
      ) {
        const year =
          yearFromPointer(
            event
          );


        if (
          year !== hoveredYear
        ) {
          hoveredYear =
            year;

          updateYearAppearance();
        }


        container.style.cursor =
          year !== null
            ? "pointer"
            : "grab";


        return;
      }


      const dx =
        event.clientX -
        pointer.x;


      const dy =
        event.clientY -
        pointer.y;


      if (
        Math.abs(dx) +
          Math.abs(dy) >
        2
      ) {
        pointer.moved =
          true;
      }


      /*
       * Horizontal:
       * unlimited 360° rotation.
       */

      orbit.azimuth -=
        dx * 0.0062;


      /*
       * Vertical:
       * always remain above the
       * Hong Kong map plane.
       */

      orbit.polar +=
        dy * 0.0052;


      orbit.polar =
        Math.min(
          1.25,

          Math.max(
            0.07,
            orbit.polar
          )
        );


      pointer.x =
        event.clientX;


      pointer.y =
        event.clientY;


      updateCamera();
      scheduleMapSync();


      const hint =
        document.getElementById(
          "temporal-sphere-hint"
        );


      if (
        hint &&
        orbit.polar >
          0.18
      ) {
        hint.textContent =
          "ANNUAL SLICES REVEALED · CLICK A RING TO INSPECT";
      }
    }
  );


  container.addEventListener(
    "pointerup",
    event => {
      if (
        !pointer.down
      ) {
        return;
      }


      if (
        !pointer.moved
      ) {
        const year =
          yearFromPointer(
            event
          );


        selectedYear =
          year === selectedYear
            ? null
            : year;


        updateYearAppearance();
      }


      pointer.down =
        false;


      pointer.id =
        null;


      container.style.cursor =
        "grab";
    }
  );


  container.addEventListener(
    "pointercancel",
    () => {
      pointer.down =
        false;

      pointer.id =
        null;

      container.style.cursor =
        "grab";
    }
  );


  container.addEventListener(
    "wheel",
    event => {
      if (
        shouldIgnorePointer(
          event
        )
      ) {
        return;
      }


      event.preventDefault();


      orbit.distance +=
        event.deltaY *
        0.0035;


      orbit.distance =
        Math.min(
          10.5,

          Math.max(
            4.8,
            orbit.distance
          )
        );


      updateCamera();
    },

    {
      passive: false
    }
  );
}


/* =========================================================
   RESET
   ========================================================= */

function resetScene() {
  orbit.azimuth =
    DEFAULT_ORBIT.azimuth;


  orbit.polar =
    DEFAULT_ORBIT.polar;


  orbit.distance =
    DEFAULT_ORBIT.distance;


  selectedYear =
    null;


  hoveredYear =
    null;


  map.jumpTo({
    center:
      HK_CENTER,

    zoom:
      9.75,

    pitch:
      0,

    bearing:
      0
  });


  updateCamera();
  updateYearAppearance();


  const hint =
    document.getElementById(
      "temporal-sphere-hint"
    );


  if (hint) {
    hint.textContent =
      "DRAG TO REVEAL THE TIME SLICES";
  }
}


/* =========================================================
   INITIALISE
   ========================================================= */

async function initialiseTemporalSphere() {
  /*
   * Load Three.js and the HKO data
   * in parallel.
   */

  const [
    threeModule,
    csvText
  ] =
    await Promise.all([
      import(
        "https://cdn.jsdelivr.net/npm/three@0.180.0/+esm"
      ),

      loadText(
        LIGHTNING_DATA_PATH
      )
    ]);


  THREE =
    threeModule;


  parseLightningData(
    csvText
  );


  buildAnnualStats();


  const start =
    () => {
      /*
       * Scene 01:
       * top-down Hong Kong.
       */

      map.jumpTo({
        center:
          HK_CENTER,

        zoom:
          9.75,

        pitch:
          0,

        bearing:
          0
      });


      createRenderer();
      createScene();

      buildTemporalSphere();

      ensureInterface();

      resizeRenderer();

      attachOrbitControls();


      document
        .getElementById(
          "reset-view"
        )
        ?.addEventListener(
          "click",
          resetScene
        );


      const resizeObserver =
        new ResizeObserver(
          resizeRenderer
        );


      resizeObserver.observe(
        map.getContainer()
      );


      /*
       * Re-render our Three.js layer
       * whenever MapLibre renders.
       */

      map.on(
        "render",
        scheduleRender
      );


      scheduleRender();


      console.log(
        "Thunder Rhythm temporal sphere ready."
      );
    };


  if (
    map.loaded()
  ) {
    start();
  }

  else {
    map.once(
      "load",
      start
    );
  }
}


initialiseTemporalSphere()
  .catch(error => {
    console.error(
      "Temporal sphere error:",
      error
    );
  });