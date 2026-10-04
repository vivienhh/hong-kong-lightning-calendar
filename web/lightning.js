/* =========================================================
   THUNDER RHYTHM
   PROTOTYPE 04-R5

   2020–2026 FULL DATA MODULES
   + ANNUAL YEAR ENCODING

   Year radius = chronology
   Year thickness / brightness / tint = annual lightning total
   Month size = 60% of previous R4 size
   Month / Day brightness = 80% of previous R4 brightness

   2026 remains partial according to the available HKO data.
   ========================================================= */


/* =========================================================
   DATA + YEARS
   ========================================================= */

const LIGHTNING_DATA_PATH =
  "./data/daily_HK_LGTG_ALL.csv";

const FULL_DATA_START_YEAR =
  2020;

const FULL_DATA_END_YEAR =
  2026;

const START_YEAR =
  2005;

const END_YEAR =
  2026;

const YEARS =
  Array.from(
    {
      length:
        END_YEAR -
        START_YEAR +
        1
    },

    (_, index) =>
      START_YEAR +
      index
  );

const YEAR_COUNT =
  YEARS.length;

const MONTH_COUNT =
  12;

const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC"
];


/* =========================================================
   FULL-YEAR MODULE GEOMETRY
   ========================================================= */

const YEAR_RADIUS =
  2.0;

const MONTH_INNER_RADIUS =
  0.050;

const MONTH_OUTER_RADIUS =
  0.42;

/*
 * Previous R4 value = 0.62.
 * Current request = 60% of that.
 * 0.62 × 0.60 = 0.372.
 */
const MONTH_SYSTEM_SCALE =
  0.372;

const RIPPLE_INNER_AMPLITUDE =
  0.055;

const RIPPLE_OUTER_AMPLITUDE =
  0.135;


/* =========================================================
   R2 YEAR CARRIER GEOMETRY
   ========================================================= */

const YEAR_RADIUS_MIN =
  0.52;

const YEAR_RADIUS_MAX =
  2.82;

const RING_TUBE_RADIUS =
  0.008;

const RING_RADIAL_SEGMENTS =
  6;

const RING_TUBULAR_SEGMENTS =
  160;


/* =========================================================
   R2 MOTION
   ========================================================= */

const YEAR_SPEED_MIN =
  0.035;

const YEAR_SPEED_MAX =
  0.075;

const MASTER_Y_SPEED =
  0.016;

const GOLDEN_PHASE =
  0.6180339887498949;


/* =========================================================
   ORTHOGRAPHIC CAMERA
   ========================================================= */

const ORTHO_VIEW_HEIGHT =
  6.65;

let cameraZoom =
  1.0;


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let THREE =
  null;

let renderer =
  null;

let scene =
  null;

let camera =
  null;

let stage =
  null;

let masterMotif =
  null;

const yearSystems =
  [];


/* =========================================================
   DATA MODULE STATE
   ========================================================= */

let lightningRecords =
  [];

const recordsByYear =
  new Map();

const annualStatsByYear =
  new Map();

let dailyLogCap =
  1;

const fullYearModules =
  [];


function isFullDataYear(year) {
  return (
    year >=
      FULL_DATA_START_YEAR &&
    year <=
      FULL_DATA_END_YEAR
  );
}


/* =========================================================
   INTERACTION
   ========================================================= */

let manualMasterY =
  0;

const pointer = {
  down:
    false,

  x:
    0
};


/* =========================================================
   HELPERS
   ========================================================= */

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.max(
    minimum,

    Math.min(
      maximum,
      value
    )
  );
}


function lerp(
  start,
  end,
  t
) {
  return (
    start +
    (
      end -
      start
    ) *
    t
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


async function loadText(path) {
  const response =
    await fetch(path);

  if (
    !response.ok
  ) {
    throw new Error(
      `Could not load ${path}: ${response.status}`
    );
  }

  return response.text();
}


/* =========================================================
   DATA
   ========================================================= */

function parseLightningData(text) {
  lightningRecords =
    text
      .trim()

      .split(/\r?\n/)

      .map(
        line =>
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
            completeness?.trim() ||
            ""
        };
      })

      .filter(record =>
        Number.isFinite(
          record.year
        ) &&

        Number.isFinite(
          record.month
        ) &&

        Number.isFinite(
          record.day
        ) &&

        Number.isFinite(
          record.value
        )
      );


  recordsByYear.clear();


  YEARS.forEach(year => {
    recordsByYear.set(
      year,

      lightningRecords
        .filter(
          record =>
            record.year ===
            year
        )

        .sort(
          (a, b) =>
            (
              a.month -
              b.month
            ) ||
            (
              a.day -
              b.day
            )
        )
    );
  });


  /*
   * Shared daily intensity scale:
   * all 2020–2026 Daily rings use
   * the same 98th-percentile log cap.
   */
  const expandedRecords =
    lightningRecords.filter(
      record =>
        isFullDataYear(
          record.year
        )
    );


  dailyLogCap =
    calculateDailyLogCap(
      expandedRecords
    );


  calculateAnnualStats();


  console.log(
    "Shared 2020–2026 lightning records loaded:",
    expandedRecords.length
  );


  YEARS
    .filter(
      isFullDataYear
    )

    .forEach(year => {
      const records =
        recordsByYear.get(
          year
        ) ||
        [];


      console.log(
        `${year} records:`,
        records.length,

        records.length
          ? `through ${
              records.at(-1).month
            }/${
              records.at(-1).day
            }`
          : "no records"
      );
    });
}


function calculateAnnualStats() {
  annualStatsByYear.clear();


  const stats =
    YEARS
      .filter(
        isFullDataYear
      )

      .map(year => {
        const records =
          recordsByYear.get(
            year
          ) ||
          [];


        const total =
          records.reduce(
            (
              sum,
              record
            ) =>
              sum +
              record.value,

            0
          );


        return {
          year,

          total,

          logTotal:
            Math.log1p(
              total
            )
        };
      });


  const logValues =
    stats.map(
      stat =>
        stat.logTotal
    );


  const minimum =
    Math.min(
      ...logValues
    );


  const maximum =
    Math.max(
      ...logValues
    );


  stats.forEach(
    stat => {
      const strength =
        maximum ===
        minimum

          ? 0.5

          : clamp(
              (
                stat.logTotal -
                minimum
              ) /
              (
                maximum -
                minimum
              ),

              0,
              1
            );


      annualStatsByYear.set(
        stat.year,

        {
          total:
            stat.total,

          strength
        }
      );


      console.log(
        `${stat.year} annual lightning:`,
        stat.total,

        "strength:",

        strength.toFixed(
          3
        )
      );
    }
  );
}


function calculateDailyLogCap(records) {
  const values =
    records
      .filter(
        record =>
          record.value >
          0
      )

      .map(
        record =>
          Math.log1p(
            record.value
          )
      )

      .sort(
        (a, b) =>
          a -
          b
      );


  if (
    !values.length
  ) {
    return 1;
  }


  const index =
    Math.floor(
      (
        values.length -
        1
      ) *
      0.98
    );


  return Math.max(
    values[index],
    1
  );
}


function normaliseLightning(value) {
  if (
    value <=
    0
  ) {
    return 0;
  }


  return clamp(
    Math.log1p(value) /
      dailyLogCap,

    0,
    1
  );
}


/* =========================================================
   SIMPLE YEAR STYLE
   ========================================================= */

function yearColour(
  yearIndex
) {
  const t =
    yearIndex /
    Math.max(
      1,
      YEAR_COUNT -
      1
    );


  const colour =
    new THREE.Color();


  const hue =
    0.51 +
    t *
      0.27;


  colour.setHSL(
    hue,
    0.82,
    0.68
  );


  return colour;
}


function yearOpacity(
  yearIndex
) {
  const t =
    yearIndex /
    Math.max(
      1,
      YEAR_COUNT -
      1
    );


  return lerp(
    0.32,
    0.62,
    t
  );
}


/* =========================================================
   R2 YEAR PHASE + SPEED
   ========================================================= */

function initialYearPhase(
  yearIndex
) {
  const distributed =
    (
      yearIndex *
      GOLDEN_PHASE
    ) %
    1;


  return distributed *
    Math.PI;
}


function yearRotationSpeed(
  yearIndex
) {
  const yearT =
    yearIndex /
    Math.max(
      1,
      YEAR_COUNT -
      1
    );


  const base =
    lerp(
      YEAR_SPEED_MIN,
      YEAR_SPEED_MAX,
      yearT
    );


  const variation =
    Math.sin(
      yearIndex *
      1.731 +
      0.72
    ) *
    0.006;


  return Math.max(
    0.015,

    base +
      variation
  );
}


/* =========================================================
   MONTH / DAY COLOUR
   ========================================================= */

function monthColour(index) {
  const colour =
    new THREE.Color();


  const t =
    index /
    Math.max(
      1,
      MONTH_COUNT -
      1
    );


  const hue =
    0.50 +
    t *
      0.32;


  colour.setHSL(
    hue,
    0.92,
    0.64
  );


  return colour;
}


function dayColour(
  monthIndex,
  intensity
) {
  const base =
    monthColour(
      monthIndex
    );


  return base.lerp(
    new THREE.Color(
      0xffffff
    ),

    Math.pow(
      intensity,
      0.75
    ) *
      0.64
  );
}


/* =========================================================
   DAILY DATA → STYLE
   ========================================================= */

function intensityLevel(
  intensity
) {
  if (
    intensity ===
    0
  ) {
    return 0;
  }


  if (
    intensity <
    0.20
  ) {
    return 1;
  }


  if (
    intensity <
    0.45
  ) {
    return 2;
  }


  if (
    intensity <
    0.72
  ) {
    return 3;
  }


  return 4;
}


function dayTubeRadius(level) {
  return [
    0.00160,
    0.00220,
    0.00310,
    0.00460,
    0.00680
  ][level];
}


function dayOpacity(level) {
  return [
    0.064,
    0.144,
    0.288,
    0.528,
    0.768
  ][level];
}


function glowOpacity(level) {
  return [
    0.000,
    0.000,
    0.028,
    0.068,
    0.136
  ][level];
}


/* =========================================================
   PAGE
   ========================================================= */

function createStage() {
  document.body.style.margin =
    "0";


  document.body.style.overflow =
    "hidden";


  stage =
    document.createElement(
      "div"
    );


  stage.id =
    "thunder-rhythm-r5";


  Object.assign(
    stage.style,
    {
      position:
        "fixed",

      inset:
        "0",

      zIndex:
        "99999",

      overflow:
        "hidden",

      background:
        "#020306",

      cursor:
        "grab",

      touchAction:
        "none"
    }
  );


  document.body.appendChild(
    stage
  );


  const label =
    document.createElement(
      "div"
    );


  label.innerHTML = `
    <div style="
      font-size:10px;
      letter-spacing:.22em;
      color:rgba(180,220,255,.55);
      margin-bottom:8px;
    ">
      THUNDER RHYTHM · PROTOTYPE 04-R5
    </div>

    <div style="
      font-size:26px;
      font-weight:600;
      letter-spacing:-.03em;
      color:#f7f8ff;
    ">
      2020–2026 Lightning Rhythm
    </div>

    <div style="
      margin-top:8px;
      font-size:11px;
      line-height:1.65;
      color:rgba(210,220,240,.55);
    ">
      YEAR → MONTH → DAY
      <br>
      YEAR LIGHT = ANNUAL LIGHTNING TOTAL
    </div>
  `;


  Object.assign(
    label.style,
    {
      position:
        "absolute",

      top:
        "34px",

      left:
        "42px",

      zIndex:
        "3",

      fontFamily:
        "Arial, Helvetica, sans-serif",

      pointerEvents:
        "none"
    }
  );


  stage.appendChild(
    label
  );


  const hint =
    document.createElement(
      "div"
    );


  hint.textContent =
    "DRAG HORIZONTALLY · SCROLL TO ZOOM";


  Object.assign(
    hint.style,
    {
      position:
        "absolute",

      left:
        "50%",

      bottom:
        "28px",

      transform:
        "translateX(-50%)",

      zIndex:
        "3",

      padding:
        "9px 14px",

      border:
        "1px solid rgba(180,210,255,.14)",

      borderRadius:
        "999px",

      background:
        "rgba(3,6,12,.55)",

      color:
        "rgba(220,230,250,.62)",

      fontFamily:
        "Arial, Helvetica, sans-serif",

      fontSize:
        "9px",

      letterSpacing:
        ".15em",

      pointerEvents:
        "none"
    }
  );


  stage.appendChild(
    hint
  );
}


/* =========================================================
   THREE SCENE
   ========================================================= */

function createThreeScene() {
  renderer =
    new THREE.WebGLRenderer({
      alpha:
        false,

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
    0x020306,
    1
  );


  Object.assign(
    renderer.domElement.style,
    {
      position:
        "absolute",

      inset:
        "0",

      width:
        "100%",

      height:
        "100%"
    }
  );


  stage.appendChild(
    renderer.domElement
  );


  scene =
    new THREE.Scene();


  camera =
    new THREE.OrthographicCamera(
      -1,
      1,
      1,
      -1,
      0.1,
      100
    );


  camera.position.set(
    0,
    0,
    10
  );


  camera.lookAt(
    0,
    0,
    0
  );


  masterMotif =
    new THREE.Group();


  masterMotif.position.set(
    0,
    0,
    0
  );


  scene.add(
    masterMotif
  );


  resize();
}


/* =========================================================
   SIMPLE R2 YEAR CARRIER
   ========================================================= */

function createSimpleCarrierRing(
  yearIndex,
  radius
) {
  const geometry =
    new THREE.TorusGeometry(
      radius,

      RING_TUBE_RADIUS,

      RING_RADIAL_SEGMENTS,

      RING_TUBULAR_SEGMENTS
    );


  const material =
    new THREE.MeshBasicMaterial({
      color:
        yearColour(
          yearIndex
        ),

      transparent:
        true,

      opacity:
        yearOpacity(
          yearIndex
        ),

      side:
        THREE.DoubleSide,

      depthWrite:
        false,

      depthTest:
        false,

      blending:
        THREE.NormalBlending
    });


  const ring =
    new THREE.Mesh(
      geometry,
      material
    );


  ring.renderOrder =
    yearIndex;


  return ring;
}


/* =========================================================
   YEAR LIGHT ORBIT
   ========================================================= */

function createYearOrbit(
  parent,
  yearStrength
) {
  const PARTICLE_COUNT =
    160;


  const phases =
    new Float32Array(
      PARTICLE_COUNT
    );


  for (
    let i = 0;
    i < PARTICLE_COUNT;
    i += 1
  ) {
    const regular =
      (
        i /
        PARTICLE_COUNT
      ) *
      Math.PI *
      2;


    const offset =
      Math.sin(
        i *
        12.9898
      ) *
      0.020;


    phases[i] =
      regular +
      offset;
  }


  const flowGeometry =
    new THREE.BufferGeometry();


  flowGeometry.setAttribute(
    "position",

    new THREE.BufferAttribute(
      new Float32Array(
        PARTICLE_COUNT *
        3
      ),

      3
    )
  );


  flowGeometry.setAttribute(
    "aPhase",

    new THREE.BufferAttribute(
      phases,
      1
    )
  );


  const yearFlowMaterial =
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          value:
            0
        },

        uRadius: {
          value:
            YEAR_RADIUS
        },

        uYearStrength: {
          value:
            yearStrength
        }
      },


      vertexShader: `
        uniform float uTime;
        uniform float uRadius;
        uniform float uYearStrength;

        attribute float aPhase;

        varying float vBrightness;


        void main() {

          float angle =
            aPhase +
            uTime * 0.34;


          vec3 p =
            vec3(
              cos(angle) *
                uRadius,

              sin(angle) *
                uRadius,

              0.0
            );


          float pulseA =
            0.5 +
            0.5 *
            sin(
              angle * 5.0 -
              uTime * 1.4
            );


          float pulseB =
            0.5 +
            0.5 *
            sin(
              angle * 11.0 +
              uTime * 0.8
            );


          vBrightness =
            0.24 +

            pow(
              pulseA,
              7.0
            ) *
              0.58 +

            pow(
              pulseB,
              10.0
            ) *
              0.38;


          vec4 mvPosition =
            modelViewMatrix *
            vec4(
              p,
              1.0
            );


          float yearThickness =
            mix(
              0.72,
              1.00,
              uYearStrength
            );


          gl_PointSize =
            (
              1.20 +
              vBrightness *
                2.40
            ) *
            yearThickness *
            (
              220.0 /
              -mvPosition.z
            );


          gl_Position =
            projectionMatrix *
            mvPosition;
        }
      `,


      fragmentShader: `
        precision highp float;

        uniform float uYearStrength;

        varying float vBrightness;


        void main() {

          vec2 p =
            gl_PointCoord -
            vec2(0.5);


          float d =
            length(p);


          float alpha =
            1.0 -
            smoothstep(
              0.08,
              0.50,
              d
            );


          float core =
            1.0 -
            smoothstep(
              0.0,
              0.15,
              d
            );


          vec3 cyan =
            vec3(
              0.30,
              0.92,
              1.00
            );


          vec3 violet =
            vec3(
              0.83,
              0.30,
              1.00
            );


          vec3 colour =
            mix(
              cyan,
              violet,

              vBrightness *
                0.52
            );


          vec3 lowYearColour =
            vec3(
              0.24,
              0.82,
              1.00
            );


          vec3 highYearColour =
            vec3(
              0.88,
              0.42,
              1.00
            );


          vec3 annualTint =
            mix(
              lowYearColour,
              highYearColour,
              uYearStrength
            );


          colour =
            mix(
              colour,
              annualTint,
              0.22
            );


          colour =
            mix(
              colour,
              vec3(1.0),

              core *
              vBrightness *
              (
                0.46 +
                uYearStrength *
                  0.18
              )
            );


          alpha *=
            0.20 +
            vBrightness *
              0.82;


          if (
            alpha <
            0.006
          ) {
            discard;
          }


          float annualBrightness =
            mix(
              0.58,
              0.80,
              uYearStrength
            );


          gl_FragColor =
            vec4(
              colour *
                annualBrightness,

              alpha
            );
        }
      `,


      transparent:
        true,

      depthWrite:
        false,

      depthTest:
        true,

      blending:
        THREE.AdditiveBlending
    });


  const flowPoints =
    new THREE.Points(
      flowGeometry,
      yearFlowMaterial
    );


  flowPoints.frustumCulled =
    false;


  parent.add(
    flowPoints
  );


  return yearFlowMaterial;
}


/* =========================================================
   MONTH SYSTEMS
   ========================================================= */

function createMonthSystems(
  parent,
  year,
  yearRecords
) {
  const monthSystems =
    [];


  for (
    let monthIndex = 0;
    monthIndex < MONTH_COUNT;
    monthIndex += 1
  ) {
    const monthNumber =
      monthIndex +
      1;


    const calendarDays =
      daysInMonth(
        year,
        monthNumber
      );


    const monthRecords =
      yearRecords.filter(
        record =>
          record.month ===
          monthNumber
      );


    const monthRoot =
      new THREE.Group();


    monthRoot.rotation.z =
      monthIndex *
      0.09;


    monthRoot.scale.setScalar(
      MONTH_SYSTEM_SCALE
    );


    const days =
      [];


    monthRecords.forEach(
      record => {
        const intensity =
          normaliseLightning(
            record.value
          );


        const level =
          intensityLevel(
            intensity
          );


        const radialT =
          (
            record.day -
            1
          ) /
          Math.max(
            1,

            calendarDays -
            1
          );


        const ringRadius =
          lerp(
            MONTH_INNER_RADIUS,
            MONTH_OUTER_RADIUS,
            radialT
          );


        const colourDay =
          dayColour(
            monthIndex,
            intensity
          );


        const dayRoot =
          new THREE.Group();


        const geometry =
          new THREE.TorusGeometry(
            ringRadius,

            dayTubeRadius(
              level
            ),

            7,
            64
          );


        const material =
          new THREE.MeshBasicMaterial({
            color:
              colourDay,

            transparent:
              true,

            opacity:
              dayOpacity(
                level
              ),

            blending:
              level >=
              3
                ? THREE.AdditiveBlending
                : THREE.NormalBlending,

            depthWrite:
              false,

            depthTest:
              true
          });


        const ring =
          new THREE.Mesh(
            geometry,
            material
          );


        dayRoot.add(
          ring
        );


        let haloRing =
          null;


        if (
          level >=
          2
        ) {
          const haloGeometry =
            new THREE.TorusGeometry(
              ringRadius,

              dayTubeRadius(
                level
              ) *
                3.2,

              7,
              64
            );


          haloRing =
            new THREE.Mesh(
              haloGeometry,

              new THREE.MeshBasicMaterial({
                color:
                  colourDay,

                transparent:
                  true,

                opacity:
                  glowOpacity(
                    level
                  ),

                blending:
                  THREE.AdditiveBlending,

                depthWrite:
                  false,

                depthTest:
                  true
              })
            );


          dayRoot.add(
            haloRing
          );
        }


        let outerHaloRing =
          null;


        if (
          level >=
          3
        ) {
          const outerHaloGeometry =
            new THREE.TorusGeometry(
              ringRadius,

              dayTubeRadius(
                level
              ) *
                5.5,

              7,
              64
            );


          outerHaloRing =
            new THREE.Mesh(
              outerHaloGeometry,

              new THREE.MeshBasicMaterial({
                color:
                  colourDay,

                transparent:
                  true,

                opacity:
                  level ===
                  4
                    ? 0.036
                    : 0.018,

                blending:
                  THREE.AdditiveBlending,

                depthWrite:
                  false,

                depthTest:
                  true
              })
            );


          dayRoot.add(
            outerHaloRing
          );
        }


        monthRoot.add(
          dayRoot
        );


        days.push({
          day:
            record.day,

          value:
            record.value,

          intensity,

          level,

          radialT,

          ringRadius,

          root:
            dayRoot,

          ring,

          haloRing,

          outerHaloRing,

          phase:
            record.day *
              0.43 +
            monthIndex *
              0.71
        });
      }
    );


    parent.add(
      monthRoot
    );


    monthSystems.push({
      index:
        monthIndex,

      month:
        monthNumber,

      name:
        MONTH_NAMES[
          monthIndex
        ],

      root:
        monthRoot,

      days,

      calendarDays,

      baseAngle:
        (
          monthIndex /
          MONTH_COUNT
        ) *
        Math.PI *
        2,

      wobblePhase:
        monthIndex *
        0.63
    });
  }


  console.log(
    `${year} concentric hierarchy:`,

    monthSystems.length,

    "months ·",

    monthSystems.reduce(
      (
        total,
        month
      ) =>
        total +
        month.days.length,

      0
    ),

    "daily concentric rings"
  );


  return monthSystems;
}


/* =========================================================
   BUILD ONE COMPLETE YEAR MODULE
   ========================================================= */

function buildFullYearModule(
  year,
  yearRecords
) {
  const root =
    new THREE.Group();


  const annualStats =
    annualStatsByYear.get(
      year
    ) ||
    {
      total:
        0,

      strength:
        0
    };


  const yearFlowMaterial =
    createYearOrbit(
      root,
      annualStats.strength
    );


  const monthSystems =
    createMonthSystems(
      root,
      year,
      yearRecords
    );


  return {
    year,

    root,

    yearFlowMaterial,

    monthSystems,

    annualTotal:
      annualStats.total,

    annualStrength:
      annualStats.strength,

    monthOrbitOffset:
      0
  };
}


/* =========================================================
   CREATE ONE YEAR WRAPPER
   ========================================================= */

function createYearCarrier(
  year,
  yearIndex
) {
  const yearT =
    yearIndex /
    Math.max(
      1,
      YEAR_COUNT -
      1
    );


  const radius =
    lerp(
      YEAR_RADIUS_MIN,
      YEAR_RADIUS_MAX,
      yearT
    );


  const wrapper =
    new THREE.Group();


  wrapper.position.set(
    0,
    0,
    0
  );


  let ring =
    null;


  let module =
    null;


  if (
    isFullDataYear(
      year
    )
  ) {
    const yearRecords =
      recordsByYear.get(
        year
      ) ||
      [];


    module =
      buildFullYearModule(
        year,
        yearRecords
      );


    const moduleScale =
      radius /
      YEAR_RADIUS;


    module.root.scale.setScalar(
      moduleScale
    );


    wrapper.add(
      module.root
    );


    module.scale =
      moduleScale;


    module.targetRadius =
      radius;


    fullYearModules.push(
      module
    );


    console.log(
      `${year} module scale:`,

      moduleScale.toFixed(
        4
      ),

      "target radius:",

      radius.toFixed(
        4
      ),

      "annual total:",

      module.annualTotal,

      "annual strength:",

      module.annualStrength.toFixed(
        3
      )
    );
  }

  else {
    ring =
      createSimpleCarrierRing(
        yearIndex,
        radius
      );


    wrapper.add(
      ring
    );
  }


  const initialY =
    initialYearPhase(
      yearIndex
    );


  wrapper.rotation.y =
    initialY;


  const rotationSpeed =
    yearRotationSpeed(
      yearIndex
    );


  masterMotif.add(
    wrapper
  );


  yearSystems.push({
    year,

    yearIndex,

    radius,

    wrapper,

    ring,

    module,

    initialY,

    rotationSpeed
  });
}


/* =========================================================
   BUILD ALL 22 YEAR WRAPPERS
   ========================================================= */

function buildYearCarriers() {
  YEARS.forEach(
    (
      year,
      yearIndex
    ) => {
      createYearCarrier(
        year,
        yearIndex
      );
    }
  );


  console.log(
    "Year wrappers built:",
    yearSystems.length
  );


  console.log(
    "Shared centre:",
    "(0, 0, 0)"
  );


  console.log(
    "Chronological radius:",
    "2005 inner → 2026 outer"
  );


  console.log(
    "Expanded Years:",
    `${FULL_DATA_START_YEAR}–${FULL_DATA_END_YEAR}`
  );
}


/* =========================================================
   MONTH + DAILY RIPPLE MOTION
   ========================================================= */

function updateMonthSystems(
  module,
  time
) {
  const xAxis =
    new THREE.Vector3(
      1,
      0,
      0
    );


  const yAxis =
    new THREE.Vector3(
      0,
      1,
      0
    );


  const zAxis =
    new THREE.Vector3(
      0,
      0,
      1
    );


  module.monthSystems.forEach(
    month => {
      const monthAngle =
        month.baseAngle +
        module.monthOrbitOffset;


      const cosMonth =
        Math.cos(
          monthAngle
        );


      const sinMonth =
        Math.sin(
          monthAngle
        );


      month.root.position.set(
        cosMonth *
          YEAR_RADIUS,

        sinMonth *
          YEAR_RADIUS,

        0
      );


      const monthTangent =
        new THREE.Vector3(
          -sinMonth,
          cosMonth,
          0
        ).normalize();


      const alignment =
        new THREE.Quaternion()
          .setFromUnitVectors(
            zAxis,
            monthTangent
          );


      const wobbleX =
        new THREE.Quaternion()
          .setFromAxisAngle(
            xAxis,

            Math.sin(
              time *
                0.36 +
              month.wobblePhase
            ) *
              0.13
          );


      const wobbleY =
        new THREE.Quaternion()
          .setFromAxisAngle(
            yAxis,

            Math.cos(
              time *
                0.29 +
              month.wobblePhase *
                1.3
            ) *
              0.085
          );


      month.root.quaternion
        .copy(
          alignment
        )

        .multiply(
          wobbleX
        )

        .multiply(
          wobbleY
        );


      month.days.forEach(
        day => {
          const amplitude =
            lerp(
              RIPPLE_INNER_AMPLITUDE,
              RIPPLE_OUTER_AMPLITUDE,
              day.radialT
            );


          const wave =
            Math.sin(
              time *
                1.55 +
              day.phase
            );


          day.root.position.z =
            wave *
            amplitude;


          const breathe =
            1 +
            Math.sin(
              time *
                0.47 +
              day.phase
            ) *
              0.006;


          day.root.scale.setScalar(
            breathe
          );


          if (
            day.haloRing
          ) {
            const haloPulse =
              1 +
              Math.sin(
                time *
                  0.82 +
                day.phase
              ) *
                0.026;


            day.haloRing
              .scale
              .setScalar(
                haloPulse
              );
          }


          if (
            day.outerHaloRing
          ) {
            const outerPulse =
              1 +
              Math.sin(
                time *
                  0.63 +
                day.phase +
                0.7
              ) *
                0.035;


            day.outerHaloRing
              .scale
              .setScalar(
                outerPulse
              );
          }
        }
      );
    }
  );
}


/* =========================================================
   UPDATE 2020–2026 MODULES
   ========================================================= */

function updateFullYearModules(
  time
) {
  fullYearModules.forEach(
    module => {
      module.yearFlowMaterial
        .uniforms
        .uTime
        .value =
          time;


      module.monthOrbitOffset =
        time *
        0.075;


      updateMonthSystems(
        module,
        time
      );
    }
  );
}


/* =========================================================
   R2 YEAR WRAPPER MOTION
   ========================================================= */

function updateYearMotion(
  time
) {
  yearSystems.forEach(
    system => {
      system.wrapper.rotation.x =
        0;


      system.wrapper.rotation.z =
        0;


      system.wrapper.rotation.y =
        system.initialY +
        time *
          system.rotationSpeed;
    }
  );


  masterMotif.rotation.x =
    0;


  masterMotif.rotation.z =
    0;


  masterMotif.rotation.y =
    manualMasterY +
    time *
      MASTER_Y_SPEED;
}


/* =========================================================
   INTERACTION
   ========================================================= */

function attachInteraction() {
  stage.addEventListener(
    "pointerdown",

    event => {
      pointer.down =
        true;


      pointer.x =
        event.clientX;


      stage.style.cursor =
        "grabbing";


      stage.setPointerCapture?.(
        event.pointerId
      );
    }
  );


  stage.addEventListener(
    "pointermove",

    event => {
      if (
        !pointer.down
      ) {
        return;
      }


      const dx =
        event.clientX -
        pointer.x;


      manualMasterY +=
        dx *
        0.005;


      pointer.x =
        event.clientX;
    }
  );


  const endPointer =
    () => {
      pointer.down =
        false;


      stage.style.cursor =
        "grab";
    };


  stage.addEventListener(
    "pointerup",
    endPointer
  );


  stage.addEventListener(
    "pointercancel",
    endPointer
  );


  stage.addEventListener(
    "wheel",

    event => {
      event.preventDefault();


      cameraZoom *=
        Math.exp(
          -event.deltaY *
            0.001
        );


      cameraZoom =
        clamp(
          cameraZoom,
          0.65,
          2.1
        );


      updateOrthographicCamera();
    },

    {
      passive:
        false
    }
  );
}


/* =========================================================
   ORTHOGRAPHIC CAMERA
   ========================================================= */

function updateOrthographicCamera() {
  if (
    !camera
  ) {
    return;
  }


  const width =
    window.innerWidth;


  const height =
    window.innerHeight;


  const aspect =
    width /
    Math.max(
      1,
      height
    );


  const halfHeight =
    ORTHO_VIEW_HEIGHT /
    2;


  const halfWidth =
    halfHeight *
    aspect;


  camera.left =
    -halfWidth;


  camera.right =
    halfWidth;


  camera.top =
    halfHeight;


  camera.bottom =
    -halfHeight;


  camera.zoom =
    cameraZoom;


  camera.updateProjectionMatrix();
}


/* =========================================================
   RESIZE
   ========================================================= */

function resize() {
  if (
    !renderer ||
    !camera
  ) {
    return;
  }


  renderer.setSize(
    window.innerWidth,
    window.innerHeight,
    false
  );


  updateOrthographicCamera();
}


/* =========================================================
   ANIMATION
   ========================================================= */

function animate(
  timestamp
) {
  requestAnimationFrame(
    animate
  );


  const time =
    timestamp *
    0.001;


  updateFullYearModules(
    time
  );


  updateYearMotion(
    time
  );


  renderer.render(
    scene,
    camera
  );
}


/* =========================================================
   INITIALISE
   ========================================================= */

async function initialisePrototype() {
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


  createStage();

  createThreeScene();

  buildYearCarriers();

  attachInteraction();


  window.addEventListener(
    "resize",
    resize
  );


  requestAnimationFrame(
    animate
  );


  console.log(
    "Thunder Rhythm 2020–2026 Annual Encoded Modules ready."
  );
}


initialisePrototype()
  .catch(error => {
    console.error(
      "2020–2026 Annual Encoded Modules error:",
      error
    );
  });