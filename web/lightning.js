const LIGHTNING_DATA_PATH = "./data/daily_HK_LGTG_ALL.csv";
const YEAR_START = 2005;
const YEAR_END = 2026;
const HK_CENTER = [114.15, 22.34];

const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

const PARTIAL_YEARS = {
  2005: "PARTIAL · STARTS 21 JUN",
  2026: "PARTIAL / YTD"
};

let THREE = null;

let lightningRecords = [];
let nestedYears = [];

let dailyLogCap = 1;
let monthlyLogCap = 1;
let annualLogCap = 1;

let renderer = null;
let scene = null;
let camera = null;

let temporalSphere = null;
let atmosphereGroup = null;

let raycaster = null;
let mouse = null;

let yearSystems = [];
let pickMeshes = [];

let selectedYear = null;
let hoveredYear = null;

let controlsAttached = false;
let animationFrameId = null;

let lastHeavyFrame = 0;
let lastInteractionTime = 0;


const DEFAULT_ORBIT = {
  azimuth: 0,
  polar: 0.08,
  distance: 8.2
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


const scratch = {
  dummy: null,
  pos: null,
  quat: null,
  zAxis: null
};


/* =========================================================
   DATA
   ========================================================= */

async function loadText(path) {
  const response =
    await fetch(path);

  if (!response.ok) {
    throw new Error(
      `Could not load ${path}: ${response.status}`
    );
  }

  return response.text();
}


function parseLightningData(text) {
  lightningRecords =
    text
      .trim()
      .split(/\r?\n/)
      .map(line =>
        line.trim()
      )
      .filter(Boolean)
      .slice(3)
      .map(line => {
        const [
          year,
          month,
          day,
          value,
          completeness
        ] =
          line.split(",");

        return {
          year:
            Number(year),

          month:
            Number(month),

          day:
            Number(day),

          value:
            Number(value),

          completeness:
            completeness?.trim() || ""
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


function percentileLogCap(
  values,
  percentile = 0.98
) {
  const sorted =
    values
      .filter(value =>
        value > 0
      )
      .map(value =>
        Math.log1p(value)
      )
      .sort(
        (a, b) =>
          a - b
      );


  if (!sorted.length) {
    return 1;
  }


  const index =
    Math.floor(
      (
        sorted.length - 1
      ) *
      percentile
    );


  return Math.max(
    sorted[index],
    1
  );
}


function normaliseLog(
  value,
  cap
) {
  if (
    value <= 0
  ) {
    return 0;
  }


  return Math.min(
    1,
    Math.log1p(value) /
      cap
  );
}


function daysInMonth(
  year,
  month
) {
  return new Date(
    Date.UTC(
      year,
      month,
      0
    )
  ).getUTCDate();
}


function buildNestedData() {
  nestedYears = [];


  for (
    let year = YEAR_START;
    year <= YEAR_END;
    year += 1
  ) {
    const records =
      lightningRecords.filter(
        record =>
          record.year ===
          year
      );


    const months =
      MONTH_NAMES.map(
        (
          name,
          monthIndex
        ) => {
          const monthRecords =
            records.filter(
              record =>
                record.month ===
                monthIndex + 1
            );


          return {
            name,

            month:
              monthIndex + 1,

            monthIndex,

            records:
              monthRecords,

            total:
              monthRecords.reduce(
                (
                  sum,
                  record
                ) =>
                  sum +
                  record.value,
                0
              ),

            activeDays:
              monthRecords.filter(
                record =>
                  record.value > 0
              ).length,

            normalised:
              0
          };
        }
      );


    let peak =
      null;


    records.forEach(
      record => {
        if (
          !peak ||
          record.value >
            peak.value
        ) {
          peak =
            record;
        }
      }
    );


    nestedYears.push({
      year,

      records,

      months,

      total:
        records.reduce(
          (
            sum,
            record
          ) =>
            sum +
            record.value,
          0
        ),

      activeDays:
        records.filter(
          record =>
            record.value > 0
        ).length,

      peakValue:
        peak?.value ?? 0,

      peakDate:
        peak
          ? `${peak.year}-${String(
              peak.month
            ).padStart(
              2,
              "0"
            )}-${String(
              peak.day
            ).padStart(
              2,
              "0"
            )}`
          : "—",

      complete:
        year >= 2006 &&
        year <= 2025,

      partialLabel:
        PARTIAL_YEARS[
          year
        ] || "",

      normalised:
        0
    });
  }


  dailyLogCap =
    percentileLogCap(
      lightningRecords.map(
        record =>
          record.value
      ),
      0.985
    );


  monthlyLogCap =
    percentileLogCap(
      nestedYears.flatMap(
        year =>
          year.months.map(
            month =>
              month.total
          )
      ),
      0.98
    );


  annualLogCap =
    percentileLogCap(
      nestedYears.map(
        year =>
          year.total
      ),
      1
    );


  nestedYears.forEach(
    year => {
      year.normalised =
        normaliseLog(
          year.total,
          annualLogCap
        );


      year.months.forEach(
        month => {
          month.normalised =
            normaliseLog(
              month.total,
              monthlyLogCap
            );
        }
      );
    }
  );


  console.log(
    "Nested temporal data ready:",
    nestedYears
  );
}


/* =========================================================
   THREE.JS SETUP
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
      position:
        "absolute",

      inset:
        "0",

      width:
        "100%",

      height:
        "100%",

      zIndex:
        "7",

      pointerEvents:
        "none"
    }
  );


  container.appendChild(
    canvas
  );


  renderer =
    new THREE.WebGLRenderer({
      canvas,

      alpha:
        true,

      antialias:
        true,

      powerPreference:
        "high-performance"
    });


  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio ||
        1,
      1.5
    )
  );


  renderer.setClearColor(
    0x000000,
    0
  );


  if (
    "outputColorSpace"
      in renderer &&
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
      40,
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


  atmosphereGroup =
    new THREE.Group();


  scene.add(
    temporalSphere,
    atmosphereGroup
  );


  scratch.dummy =
    new THREE.Object3D();


  scratch.pos =
    new THREE.Vector3();


  scratch.quat =
    new THREE.Quaternion();


  scratch.zAxis =
    new THREE.Vector3(
      0,
      0,
      1
    );


  updateCamera();
}


/* =========================================================
   COLOUR + GLOW
   ========================================================= */

function makeGlowTexture() {
  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    256;

  canvas.height =
    256;


  const ctx =
    canvas.getContext(
      "2d"
    );


  const gradient =
    ctx.createRadialGradient(
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
    "rgba(225,250,255,0.95)"
  );

  gradient.addColorStop(
    0.28,
    "rgba(120,225,255,0.50)"
  );

  gradient.addColorStop(
    0.52,
    "rgba(165,115,255,0.20)"
  );

  gradient.addColorStop(
    0.78,
    "rgba(90,55,255,0.06)"
  );

  gradient.addColorStop(
    1,
    "rgba(0,0,0,0)"
  );


  ctx.fillStyle =
    gradient;


  ctx.fillRect(
    0,
    0,
    256,
    256
  );


  return new THREE.CanvasTexture(
    canvas
  );
}


function temporalHue(
  yearIndex,
  monthIndex = 0
) {
  const yearT =
    yearIndex /
    Math.max(
      1,
      nestedYears.length - 1
    );


  const monthT =
    monthIndex /
    11;


  return (
    190 +
    120 *
      (
        yearT * 0.78 +
        monthT * 0.22
      )
  );
}


function makeTemporalColor(
  yearIndex,
  monthIndex,
  intensity,
  floor = 0.03
) {
  const color =
    new THREE.Color();


  const shaped =
    Math.pow(
      intensity,
      0.70
    );


  color.setHSL(
    temporalHue(
      yearIndex,
      monthIndex
    ) /
      360,

    0.88,

    floor +
      shaped *
        (
          0.86 -
          floor
        )
  );


  return color;
}


/* =========================================================
   ATMOSPHERE
   ========================================================= */

function buildAtmosphere() {
  atmosphereGroup.clear();


  const texture =
    makeGlowTexture();


  const glowA =
    new THREE.Sprite(
      new THREE.SpriteMaterial({
        map:
          texture,

        color:
          0x9fe7ff,

        transparent:
          true,

        opacity:
          0.16,

        blending:
          THREE.AdditiveBlending,

        depthWrite:
          false
      })
    );


  glowA.scale.set(
    7.3,
    7.3,
    1
  );


  atmosphereGroup.add(
    glowA
  );


  const glowB =
    new THREE.Sprite(
      new THREE.SpriteMaterial({
        map:
          texture,

        color:
          0xe2b7ff,

        transparent:
          true,

        opacity:
          0.08,

        blending:
          THREE.AdditiveBlending,

        depthWrite:
          false
      })
    );


  glowB.scale.set(
    5.0,
    5.0,
    1
  );


  atmosphereGroup.add(
    glowB
  );


  const count =
    900;


  const positions =
    new Float32Array(
      count * 3
    );


  let seed =
    91277;


  const random =
    () => {
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
    };


  for (
    let i = 0;
    i < count;
    i += 1
  ) {
    const theta =
      random() *
      Math.PI *
      2;


    const phi =
      Math.acos(
        random() *
          2 -
        1
      );


    const radius =
      1.7 +
      random() *
        1.1;


    positions[
      i * 3
    ] =
      radius *
      Math.sin(phi) *
      Math.cos(theta);


    positions[
      i * 3 + 1
    ] =
      radius *
      Math.cos(phi);


    positions[
      i * 3 + 2
    ] =
      radius *
      Math.sin(phi) *
      Math.sin(theta);
  }


  const geometry =
    new THREE.BufferGeometry();


  geometry.setAttribute(
    "position",

    new THREE.BufferAttribute(
      positions,
      3
    )
  );


  const particles =
    new THREE.Points(
      geometry,

      new THREE.PointsMaterial({
        color:
          0xd1ecff,

        size:
          0.014,

        transparent:
          true,

        opacity:
          0.18,

        blending:
          THREE.AdditiveBlending,

        depthWrite:
          false
      })
    );


  atmosphereGroup.add(
    particles
  );
}


/* =========================================================
   GEOMETRY HELPERS
   ========================================================= */

function createCircleLine(
  radius,
  color,
  opacity,
  segments = 128
) {
  const points =
    [];


  for (
    let i = 0;
    i <= segments;
    i += 1
  ) {
    const angle =
      (
        i /
        segments
      ) *
      Math.PI *
      2;


    points.push(
      new THREE.Vector3(
        Math.cos(angle) *
          radius,

        0,

        Math.sin(angle) *
          radius
      )
    );
  }


  return new THREE.LineLoop(
    new THREE.BufferGeometry()
      .setFromPoints(
        points
      ),

    new THREE.LineBasicMaterial({
      color,

      transparent:
        true,

      opacity,

      blending:
        THREE.AdditiveBlending,

      depthWrite:
        false
    })
  );
}


function monthFrame(
  monthAngle,
  yearRadius
) {
  const cosA =
    Math.cos(
      monthAngle
    );


  const sinA =
    Math.sin(
      monthAngle
    );


  return {
    center:
      new THREE.Vector3(
        cosA *
          yearRadius,

        0,

        sinA *
          yearRadius
      ),

    normal:
      new THREE.Vector3(
        cosA,
        0,
        sinA
      ).normalize(),

    e1:
      new THREE.Vector3(
        0,
        1,
        0
      ),

    e2:
      new THREE.Vector3(
        -sinA,
        0,
        cosA
      ).normalize()
  };
}


function buildMonthLines(
  yearObj
) {
  const positions =
    [];


  const colors =
    [];


  const segments =
    36;


  yearObj.months.forEach(
    month => {
      const angle =
        (
          month.monthIndex /
          12
        ) *
        Math.PI *
        2;


      const frame =
        monthFrame(
          angle,
          yearObj.radius
        );


      const color =
        makeTemporalColor(
          yearObj.yearIndex,
          month.monthIndex,
          month.normalised,
          month.records.length
            ? 0.045
            : 0.012
        );


      for (
        let i = 0;
        i < segments;
        i += 1
      ) {
        const a0 =
          (
            i /
            segments
          ) *
          Math.PI *
          2;


        const a1 =
          (
            (
              i + 1
            ) /
            segments
          ) *
          Math.PI *
          2;


        const p0 =
          frame.center
            .clone()
            .add(
              frame.e1
                .clone()
                .multiplyScalar(
                  Math.cos(a0) *
                    yearObj.monthRadius
                )
            )
            .add(
              frame.e2
                .clone()
                .multiplyScalar(
                  Math.sin(a0) *
                    yearObj.monthRadius
                )
            );


        const p1 =
          frame.center
            .clone()
            .add(
              frame.e1
                .clone()
                .multiplyScalar(
                  Math.cos(a1) *
                    yearObj.monthRadius
                )
            )
            .add(
              frame.e2
                .clone()
                .multiplyScalar(
                  Math.sin(a1) *
                    yearObj.monthRadius
                )
            );


        positions.push(
          p0.x,
          p0.y,
          p0.z,

          p1.x,
          p1.y,
          p1.z
        );


        colors.push(
          color.r,
          color.g,
          color.b,

          color.r,
          color.g,
          color.b
        );
      }
    }
  );


  const geometry =
    new THREE.BufferGeometry();


  geometry.setAttribute(
    "position",

    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  );


  geometry.setAttribute(
    "color",

    new THREE.Float32BufferAttribute(
      colors,
      3
    )
  );


  return new THREE.LineSegments(
    geometry,

    new THREE.LineBasicMaterial({
      vertexColors:
        true,

      transparent:
        true,

      opacity:
        0.24,

      blending:
        THREE.AdditiveBlending,

      depthWrite:
        false
    })
  );
}


/* =========================================================
   BUILD NESTED TEMPORAL SPHERE
   ========================================================= */

function clearTemporalSphere() {
  if (
    !temporalSphere
  ) {
    return;
  }


  temporalSphere.traverse(
    object => {
      object.geometry
        ?.dispose?.();


      if (
        Array.isArray(
          object.material
        )
      ) {
        object.material.forEach(
          material =>
            material.dispose?.()
        );
      }

      else {
        object.material
          ?.dispose?.();
      }
    }
  );


  temporalSphere.clear();


  yearSystems =
    [];


  pickMeshes =
    [];
}


function buildNestedTemporalSphere() {
  clearTemporalSphere();

  buildAtmosphere();


  const coreGeometry =
    new THREE.TorusGeometry(
      0.038,
      0.010,
      4,
      12
    );


  const haloGeometry =
    new THREE.TorusGeometry(
      0.050,
      0.022,
      4,
      12
    );


  nestedYears.forEach(
    (
      yearData,
      yearIndex
    ) => {
      const yearGroup =
        new THREE.Group();


      const timeT =
        yearIndex /
        Math.max(
          1,
          nestedYears.length - 1
        );


      /*
       * Later years sit slightly
       * farther outward.
       * This represents time,
       * not lightning magnitude.
       */

      const radius =
        1.72 +
        timeT *
          0.54;


      const monthRadius =
        0.29 +
        0.025 *
          Math.sin(
            yearIndex *
              0.71
          );


      /*
       * Each year has a different
       * orientation, so all systems
       * interweave into a sphere.
       */

      const baseRotation = {
        x:
          0.36 *
            Math.sin(
              yearIndex *
                1.21
            ) +
          0.10,

        y:
          yearIndex *
          0.17,

        z:
          0.42 *
          Math.cos(
            yearIndex *
              0.93
          )
      };


      yearGroup.rotation.set(
        baseRotation.x,
        baseRotation.y,
        baseRotation.z
      );


      const yearColor =
        makeTemporalColor(
          yearIndex,
          5,
          yearData.normalised,
          0.08
        );


      const orbitLine =
        createCircleLine(
          radius,

          yearColor,

          yearData.complete
            ? (
                0.12 +
                yearData.normalised *
                  0.20
              )
            : 0.045,

          144
        );


      yearGroup.add(
        orbitLine
      );


      const yearObj = {
        group:
          yearGroup,

        stats:
          yearData,

        yearIndex,

        radius,

        monthRadius,

        months:
          yearData.months,

        baseRotation,

        spinSpeed:
          0.018 +
          (
            yearIndex %
            7
          ) *
            0.0015,

        phase:
          yearIndex *
          0.71,

        dayInstances:
          [],

        orbitLine,

        monthLines:
          null,

        coreMesh:
          null,

        haloMesh:
          null,

        coreBaseOpacity:
          yearData.complete
            ? 0.90
            : 0.40,

        haloBaseOpacity:
          yearData.complete
            ? 0.18
            : 0.07
      };


      yearObj.monthLines =
        buildMonthLines(
          yearObj
        );


      yearGroup.add(
        yearObj.monthLines
      );


      let instanceIndex =
        0;


      yearData.months.forEach(
        month => {
          const monthAngle =
            (
              month.monthIndex /
              12
            ) *
            Math.PI *
            2;


          const frame =
            monthFrame(
              monthAngle,
              radius
            );


          const calendarDays =
            daysInMonth(
              yearData.year,
              month.month
            );


          month.records.forEach(
            record => {
              const intensity =
                normaliseLog(
                  record.value,
                  dailyLogCap
                );


              yearObj.dayInstances.push({
                index:
                  instanceIndex,

                frame,

                monthIndex:
                  month.monthIndex,

                baseAngle:
                  (
                    (
                      record.day -
                      1
                    ) /
                    calendarDays
                  ) *
                  Math.PI *
                  2,

                value:
                  record.value,

                intensity,

                phase:
                  yearIndex *
                    0.87 +
                  month.monthIndex *
                    0.61 +
                  record.day *
                    0.19,

                spinSpeed:
                  0.055 +
                  month.monthIndex *
                    0.0025 +
                  (
                    yearIndex %
                    4
                  ) *
                    0.0015
              });


              instanceIndex +=
                1;
            }
          );
        }
      );


      const coreMesh =
        new THREE.InstancedMesh(
          coreGeometry,

          new THREE.MeshBasicMaterial({
            color:
              0xffffff,

            transparent:
              true,

            opacity:
              yearObj.coreBaseOpacity,

            blending:
              THREE.AdditiveBlending,

            depthWrite:
              false,

            vertexColors:
              true
          }),

          yearObj
            .dayInstances
            .length
        );


      const haloMesh =
        new THREE.InstancedMesh(
          haloGeometry,

          new THREE.MeshBasicMaterial({
            color:
              0xffffff,

            transparent:
              true,

            opacity:
              yearObj.haloBaseOpacity,

            blending:
              THREE.AdditiveBlending,

            depthWrite:
              false,

            vertexColors:
              true
          }),

          yearObj
            .dayInstances
            .length
        );


      coreMesh
        .instanceMatrix
        .setUsage(
          THREE.DynamicDrawUsage
        );


      haloMesh
        .instanceMatrix
        .setUsage(
          THREE.DynamicDrawUsage
        );


      yearObj.dayInstances.forEach(
        day => {
          const color =
            makeTemporalColor(
              yearIndex,

              day.monthIndex,

              day.intensity,

              day.value > 0
                ? 0.045
                : 0.008
            );


          coreMesh.setColorAt(
            day.index,
            color
          );


          haloMesh.setColorAt(
            day.index,
            color
          );
        }
      );


      if (
        coreMesh.instanceColor
      ) {
        coreMesh.instanceColor
          .needsUpdate =
            true;
      }


      if (
        haloMesh.instanceColor
      ) {
        haloMesh.instanceColor
          .needsUpdate =
            true;
      }


      yearObj.coreMesh =
        coreMesh;


      yearObj.haloMesh =
        haloMesh;


      yearGroup.add(
        haloMesh,
        coreMesh
      );


      /*
       * Invisible selection ring.
       */

      const pickMesh =
        new THREE.Mesh(
          new THREE.TorusGeometry(
            radius,
            0.16,
            5,
            96
          ),

          new THREE.MeshBasicMaterial({
            transparent:
              true,

            opacity:
              0,

            depthWrite:
              false
          })
        );


      pickMesh.rotation.x =
        Math.PI /
        2;


      pickMesh.userData.stats =
        yearData;


      pickMeshes.push(
        pickMesh
      );


      yearGroup.add(
        pickMesh
      );


      yearSystems.push(
        yearObj
      );


      temporalSphere.add(
        yearGroup
      );
    }
  );


  updateDayInstances(
    0
  );


  updateYearAppearance();
}


/* =========================================================
   DAILY LIGHT CELL MOTION
   ========================================================= */

function updateDayInstances(
  timeSeconds
) {
  yearSystems.forEach(
    yearObj => {
      yearObj.dayInstances.forEach(
        day => {
          const angle =
            day.baseAngle +
            timeSeconds *
              day.spinSpeed +
            Math.sin(
              timeSeconds *
                0.42 +
              day.phase
            ) *
              0.08;


          scratch.pos.copy(
            day.frame.center
          );


          scratch.pos
            .addScaledVector(
              day.frame.e1,

              Math.cos(angle) *
                yearObj.monthRadius
            );


          scratch.pos
            .addScaledVector(
              day.frame.e2,

              Math.sin(angle) *
                yearObj.monthRadius
            );


          /*
           * Small depth motion makes
           * each monthly orbit feel alive.
           */

          scratch.pos
            .addScaledVector(
              day.frame.normal,

              (
                0.02 +
                day.intensity *
                  0.08
              ) *
              Math.sin(
                timeSeconds *
                  0.31 +
                day.phase
              )
            );


          scratch.quat
            .setFromUnitVectors(
              scratch.zAxis,
              day.frame.normal
            );


          const shaped =
            Math.pow(
              day.intensity,
              0.68
            );


          const breathing =
            1 +
            Math.sin(
              timeSeconds *
                1.15 +
              day.phase
            ) *
              0.035;


          /*
           * Zero-lightning days stay
           * almost invisible.
           */

          const coreScale =
            day.value <= 0
              ? 0.12
              : (
                  0.55 +
                  shaped *
                    2.30
                ) *
                breathing;


          scratch.dummy
            .position
            .copy(
              scratch.pos
            );


          scratch.dummy
            .quaternion
            .copy(
              scratch.quat
            );


          scratch.dummy
            .scale
            .setScalar(
              coreScale
            );


          scratch.dummy
            .updateMatrix();


          yearObj.coreMesh
            .setMatrixAt(
              day.index,
              scratch.dummy.matrix
            );


          const haloScale =
            day.value <= 0
              ? 0.01
              : coreScale *
                (
                  1.35 +
                  shaped *
                    1.70
                );


          scratch.dummy
            .scale
            .setScalar(
              haloScale
            );


          scratch.dummy
            .updateMatrix();


          yearObj.haloMesh
            .setMatrixAt(
              day.index,
              scratch.dummy.matrix
            );
        }
      );


      yearObj
        .coreMesh
        .instanceMatrix
        .needsUpdate =
          true;


      yearObj
        .haloMesh
        .instanceMatrix
        .needsUpdate =
          true;
    }
  );
}


/* =========================================================
   CAMERA + MAP
   ========================================================= */

function updateCamera() {
  if (
    !camera
  ) {
    return;
  }


  const {
    azimuth,
    polar,
    distance
  } =
    orbit;


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
}


function syncMapToOrbit() {
  if (
    !map ||
    !map.loaded()
  ) {
    return;
  }


  const progress =
    Math.min(
      1,

      Math.max(
        0,

        (
          orbit.polar -
          0.08
        ) /
        (
          1.30 -
          0.08
        )
      )
    );


  map.jumpTo({
    pitch:
      progress *
      62,

    bearing:
      -(
        orbit.azimuth *
        180 /
        Math.PI
      )
  });
}


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
    width /
    height;


  camera.updateProjectionMatrix();
}


/* =========================================================
   INTERFACE
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
        position:absolute;
        top:32px;
        right:72px;
        width:245px;
        z-index:12;
        pointer-events:none;
        color:#f4f5ff;
        font-family:Arial,Helvetica,sans-serif;
      }

      #temporal-sphere-info .eyebrow {
        margin-bottom:10px;
        font-size:10px;
        letter-spacing:.22em;
        color:rgba(200,220,255,.58);
      }

      #temporal-sphere-info .year {
        font-size:34px;
        line-height:1;
        font-weight:650;
        letter-spacing:-.03em;
      }

      #temporal-sphere-info .count {
        margin-top:9px;
        font-size:13px;
        line-height:1.5;
        color:rgba(225,231,255,.88);
      }

      #temporal-sphere-info .meta {
        margin-top:12px;
        font-size:10px;
        line-height:1.65;
        letter-spacing:.08em;
        color:rgba(190,201,231,.60);
      }

      #temporal-sphere-hint {
        position:absolute;
        left:50%;
        bottom:30px;
        transform:translateX(-50%);
        z-index:12;
        pointer-events:none;

        padding:9px 13px;

        border:
          1px solid
          rgba(
            190,
            210,
            255,
            .17
          );

        border-radius:
          999px;

        background:
          rgba(
            3,
            5,
            11,
            .55
          );

        backdrop-filter:
          blur(8px);

        color:
          rgba(
            223,
            231,
            255,
            .72
          );

        font-family:
          Arial,
          Helvetica,
          sans-serif;

        font-size:
          9px;

        letter-spacing:
          .16em;

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
      NESTED TEMPORAL LIGHT FIELD
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
      22 years · ${lightningRecords.length.toLocaleString()} daily records
    </div>

    <div
      class="meta"
      id="sphere-meta"
    >
      YEAR → 12 MONTH ORBITS<br>
      MONTH → DAILY LIGHT CELLS<br>
      DRAG TO ROTATE · SCROLL TO ZOOM
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
    "DRAG TO ORBIT THE LIVING DATA SPHERE";


  container.appendChild(
    hint
  );


  updateInfoPanel();
}


function updateInfoPanel() {
  const yearEl =
    document.getElementById(
      "sphere-year"
    );


  const countEl =
    document.getElementById(
      "sphere-count"
    );


  const metaEl =
    document.getElementById(
      "sphere-meta"
    );


  if (
    !yearEl ||
    !countEl ||
    !metaEl
  ) {
    return;
  }


  const activeYear =
    selectedYear ??
    hoveredYear;


  if (
    activeYear === null
  ) {
    yearEl.textContent =
      "2005–2026";


    countEl.textContent =
      `22 years · ${lightningRecords.length.toLocaleString()} daily records`;


    metaEl.innerHTML =
      "YEAR → 12 MONTH ORBITS<br>" +
      "MONTH → DAILY LIGHT CELLS<br>" +
      "DRAG TO ROTATE · SCROLL TO ZOOM";


    return;
  }


  const stats =
    nestedYears.find(
      item =>
        item.year ===
        activeYear
    );


  if (
    !stats
  ) {
    return;
  }


  yearEl.textContent =
    String(
      stats.year
    );


  countEl.innerHTML =
    `<strong>${stats.total.toLocaleString()}</strong> lightning strikes`;


  metaEl.innerHTML =
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
  yearSystems.forEach(
    yearObj => {
      const selected =
        selectedYear ===
        yearObj.stats.year;


      const hovered =
        hoveredYear ===
        yearObj.stats.year;


      if (
        selectedYear !==
        null
      ) {
        yearObj
          .coreMesh
          .material
          .opacity =
            selected
              ? 1
              : 0.05;


        yearObj
          .haloMesh
          .material
          .opacity =
            selected
              ? 0.26
              : 0.007;


        yearObj
          .orbitLine
          .material
          .opacity =
            selected
              ? 0.70
              : 0.02;


        yearObj
          .monthLines
          .material
          .opacity =
            selected
              ? 0.52
              : 0.03;


        yearObj
          .group
          .scale
          .setScalar(
            selected
              ? 1.04
              : 1
          );
      }

      else {
        yearObj
          .coreMesh
          .material
          .opacity =
            hovered
              ? Math.min(
                  1,
                  yearObj
                    .coreBaseOpacity *
                    1.15
                )
              : yearObj
                  .coreBaseOpacity;


        yearObj
          .haloMesh
          .material
          .opacity =
            hovered
              ? Math.min(
                  0.32,
                  yearObj
                    .haloBaseOpacity *
                    1.8
                )
              : yearObj
                  .haloBaseOpacity;


        yearObj
          .orbitLine
          .material
          .opacity =
            hovered
              ? 0.50
              : (
                  yearObj
                    .stats
                    .complete
                    ? (
                        0.12 +
                        yearObj
                          .stats
                          .normalised *
                          0.20
                      )
                    : 0.045
                );


        yearObj
          .monthLines
          .material
          .opacity =
            hovered
              ? 0.44
              : 0.24;


        yearObj
          .group
          .scale
          .setScalar(
            hovered
              ? 1.02
              : 1
          );
      }
    }
  );


  updateInfoPanel();
}


/* =========================================================
   PICKING
   ========================================================= */

function setMouseFromEvent(
  event
) {
  const rect =
    map
      .getContainer()
      .getBoundingClientRect();


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


  if (
    !hits.length
  ) {
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
   USER CONTROLS
   ========================================================= */

function shouldIgnorePointer(
  event
) {
  const target =
    event.target instanceof
      Element
      ? event.target
      : null;


  return Boolean(
    target?.closest(
      "button, a, .maplibregl-ctrl"
    )
  );
}


function attachOrbitControls() {
  if (
    controlsAttached
  ) {
    return;
  }


  controlsAttached =
    true;


  const container =
    map.getContainer();


  container.style.touchAction =
    "none";


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


      lastInteractionTime =
        performance.now();


      container
        .setPointerCapture?.(
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
          year !==
          hoveredYear
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


      orbit.azimuth -=
        dx *
        0.0062;


      orbit.polar +=
        dy *
        0.0052;


      orbit.polar =
        Math.min(
          1.30,

          Math.max(
            0.08,
            orbit.polar
          )
        );


      pointer.x =
        event.clientX;


      pointer.y =
        event.clientY;


      lastInteractionTime =
        performance.now();


      updateCamera();

      syncMapToOrbit();


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
          "22 YEARS · 12 MONTH ORBITS PER YEAR · DAILY LIGHT CELLS";
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
          year ===
          selectedYear
            ? null
            : year;


        updateYearAppearance();
      }


      pointer.down =
        false;


      pointer.id =
        null;


      lastInteractionTime =
        performance.now();


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
          11.0,

          Math.max(
            5.1,
            orbit.distance
          )
        );


      lastInteractionTime =
        performance.now();


      updateCamera();
    },

    {
      passive:
        false
    }
  );
}


/* =========================================================
   CONTINUOUS MOTION
   ========================================================= */

function animate(
  timestamp
) {
  animationFrameId =
    requestAnimationFrame(
      animate
    );


  if (
    !renderer ||
    !scene ||
    !camera
  ) {
    return;
  }


  const time =
    timestamp *
    0.001;


  /*
   * Expensive day-instance
   * transforms update at ~30 fps.
   */

  if (
    timestamp -
      lastHeavyFrame >
    33
  ) {
    lastHeavyFrame =
      timestamp;


    updateDayInstances(
      time
    );


    const recentInteraction =
      timestamp -
        lastInteractionTime <
      1200;


    temporalSphere
      .rotation
      .y +=
        (
          recentInteraction
            ? 0.004
            : 0.020
        ) *
        0.033;


    temporalSphere
      .rotation
      .x =
        Math.sin(
          time *
          0.10
        ) *
        0.035;


    temporalSphere
      .rotation
      .z =
        Math.cos(
          time *
          0.08
        ) *
        0.022;


    atmosphereGroup
      .rotation
      .y =
        -time *
        0.012;


    /*
     * Each year has its own
     * slow precession.
     */

    yearSystems.forEach(
      yearObj => {
        const t =
          time *
          yearObj.spinSpeed;


        yearObj.group.rotation.x =
          yearObj
            .baseRotation
            .x +
          Math.sin(
            t +
            yearObj.phase
          ) *
            0.055;


        yearObj.group.rotation.y =
          yearObj
            .baseRotation
            .y +
          Math.cos(
            t *
              0.83 +
            yearObj.phase
          ) *
            0.060;


        yearObj.group.rotation.z =
          yearObj
            .baseRotation
            .z +
          Math.sin(
            t *
              0.71 +
            yearObj.phase
          ) *
            0.045;
      }
    );
  }


  renderer.render(
    scene,
    camera
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


  temporalSphere.rotation.set(
    0,
    0,
    0
  );


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


  if (
    hint
  ) {
    hint.textContent =
      "DRAG TO ORBIT THE LIVING DATA SPHERE";
  }
}


/* =========================================================
   INITIALISE
   ========================================================= */

async function initialiseTemporalSphere() {
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


  buildNestedData();


  const start =
    () => {
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

      buildNestedTemporalSphere();

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


      if (
        animationFrameId
      ) {
        cancelAnimationFrame(
          animationFrameId
        );
      }


      animationFrameId =
        requestAnimationFrame(
          animate
        );


      console.log(
        "Thunder Rhythm nested particle sphere ready."
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
      "Nested particle sphere error:",
      error
    );
  });