/* =========================================================
   THUNDER RHYTHM
   PROTOTYPE 04-R8.2

   2005–2026 NEON DIFFUSE FLOW

   Radius = chronology
   Year colour = year identity
   Overall thickness / brightness = annual lightning total
   Local flowing energy = monthly lightning total
   Sparse flares = strongest lightning days

   VISUAL UPDATE FROM R8.1
   ---------------------------------------------------------
   - remove hard particle boundaries
   - Gaussian luminous body
   - wider diffuse halo
   - flowing / breathing light clusters
   - retain bright neon cyan / green / blue /
     violet / pink / white palette
   ========================================================= */


/* =========================================================
   DATA + YEARS
   ========================================================= */

const LIGHTNING_DATA_PATH =
  "./data/daily_HK_LGTG_ALL.csv";

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


/* =========================================================
   YEAR OVERVIEW GEOMETRY
   ========================================================= */

const YEAR_RADIUS_MIN =
  0.52;

const YEAR_RADIUS_MAX =
  2.82;

const YEAR_PARTICLE_COUNT =
  256;

const YEAR_PHASE_OFFSET =
  0.010;

const PEAK_FLARE_COUNT =
  2;


/* =========================================================
   YEAR MOTION
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
   CAMERA
   ========================================================= */

const ORTHO_VIEW_HEIGHT =
  6.65;

let cameraZoom =
  1.0;


/* =========================================================
   BRIGHT NEON YEAR IDENTITIES
   ========================================================= */

const YEAR_COLOUR_PAIRS = [
  // 2005 — pale gold
  [0xffc94a, 0xffffdf],

  // 2006 — warm yellow
  [0xffd84a, 0xffffcb],

  // 2007 — lemon
  [0xffe856, 0xffffbd],

  // 2008 — ivory yellow
  [0xf5e88a, 0xffffe5],

  // 2009 — icy cyan accent
  [0x78dce8, 0xdfffff],

  // 2010 — electric yellow
  [0xffed3d, 0xffffcc],

  // 2011 — golden yellow
  [0xffcd32, 0xfff1a8],

  // 2012 — amber
  [0xffad32, 0xffdf9c],

  // 2013 — pale blue accent
  [0x92bde5, 0xe6f3ff],

  // 2014 — champagne
  [0xffe49a, 0xffffed],

  // 2015 — cool ice blue
  [0x82cedc, 0xe6fcff],

  // 2016 — cool lavender
  [0xb8addd, 0xf2edff],

  // 2017 — soft lemon
  [0xf4df69, 0xffffcf],

  // 2018 — acid lemon
  [0xe8ee55, 0xfcffc8],

  // 2019 — honey gold
  [0xffc440, 0xffe7a8],

  // 2020 — pale warm gold
  [0xffd86a, 0xffffce],

  // 2021 — luminous lemon
  [0xffeb4b, 0xffffbd],

  // 2022 — icy blue accent
  [0x8fc9df, 0xe9faff],

  // 2023 — amber yellow
  [0xffbd3d, 0xffe1a0],

  // 2024 — champagne yellow
  [0xffdf72, 0xffffd4],

  // 2025 — bright golden yellow
  [0xffc735, 0xffffb6],

  // 2026 — pale yellow-white
  [0xffed8a, 0xfffff0]
];


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


/* =========================================================
   DATA STATE
   ========================================================= */

let lightningRecords =
  [];

const recordsByYear =
  new Map();

const annualStatsByYear =
  new Map();

const monthlyStatsByYear =
  new Map();

let monthlyLogCap =
  1;

let dailyLogCap =
  1;


/* =========================================================
   YEAR SYSTEM STATE
   ========================================================= */

const yearSystems =
  [];


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


function daysInYear(year) {
  return (
    new Date(
      Date.UTC(
        year + 1,
        0,
        1
      )
    ) -
    new Date(
      Date.UTC(
        year,
        0,
        1
      )
    )
  ) /
  86400000;
}


function dayOfYear(
  year,
  month,
  day
) {
  const start =
    Date.UTC(
      year,
      0,
      1
    );


  const current =
    Date.UTC(
      year,
      month - 1,
      day
    );


  return (
    Math.floor(
      (
        current -
        start
      ) /
      86400000
    ) +
    1
  );
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
   DATA PARSING
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
        ) &&

        record.year >=
          START_YEAR &&

        record.year <=
          END_YEAR
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


  calculateAnnualStats();

  calculateMonthlyStats();


  dailyLogCap =
    calculateLogCap(
      lightningRecords.map(
        record =>
          record.value
      ),

      0.98
    );


  console.log(
    "R8.2 lightning records loaded:",
    lightningRecords.length
  );
}


/* =========================================================
   NORMALISATION
   ========================================================= */

function calculateLogCap(
  rawValues,
  percentile
) {
  const values =
    rawValues
      .filter(
        value =>
          Number.isFinite(
            value
          ) &&

          value >
          0
      )

      .map(
        value =>
          Math.log1p(
            value
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
      percentile
    );


  return Math.max(
    values[index],
    1
  );
}


function normaliseWithCap(
  value,
  cap
) {
  if (
    value <=
    0
  ) {
    return 0;
  }


  return clamp(
    Math.log1p(
      value
    ) /
      cap,

    0,
    1
  );
}


/* =========================================================
   ANNUAL TOTALS
   ========================================================= */

function calculateAnnualStats() {
  annualStatsByYear.clear();


  const rawStats =
    YEARS.map(year => {
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


  const completeStats =
    rawStats.filter(
      stat =>
        stat.year >=
          2006 &&

        stat.year <=
          2025
    );


  const minimum =
    Math.min(
      ...completeStats.map(
        stat =>
          stat.logTotal
      )
    );


  const maximum =
    Math.max(
      ...completeStats.map(
        stat =>
          stat.logTotal
      )
    );


  rawStats.forEach(
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

          strength,

          partial:
            stat.year ===
              2005 ||

            stat.year ===
              2026
        }
      );
    }
  );
}


/* =========================================================
   MONTHLY TOTALS
   ========================================================= */

function calculateMonthlyStats() {
  monthlyStatsByYear.clear();


  const allMonthlyTotals =
    [];


  YEARS.forEach(year => {
    const records =
      recordsByYear.get(
        year
      ) ||
      [];


    const totals =
      Array.from(
        {
          length:
            MONTH_COUNT
        },

        () =>
          0
      );


    records.forEach(
      record => {
        totals[
          record.month -
          1
        ] +=
          record.value;
      }
    );


    monthlyStatsByYear.set(
      year,

      {
        totals,

        strengths:
          []
      }
    );


    totals.forEach(value => {
      if (
        value >
        0
      ) {
        allMonthlyTotals.push(
          value
        );
      }
    });
  });


  monthlyLogCap =
    calculateLogCap(
      allMonthlyTotals,
      0.97
    );


  YEARS.forEach(year => {
    const stats =
      monthlyStatsByYear.get(
        year
      );


    stats.strengths =
      stats.totals.map(
        value =>
          normaliseWithCap(
            value,
            monthlyLogCap
          )
      );
  });
}


/* =========================================================
   YEAR COLOUR
   ========================================================= */

function yearColours(
  yearIndex
) {
  const pair =
    YEAR_COLOUR_PAIRS[
      yearIndex %
      YEAR_COLOUR_PAIRS.length
    ];


  return {
    base:
      new THREE.Color(
        pair[0]
      ),

    accent:
      new THREE.Color(
        pair[1]
      )
  };
}


/* =========================================================
   YEAR PHASE + SPEED
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
    "thunder-rhythm-r82";


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
      color:rgba(180,220,255,.58);
      margin-bottom:8px;
    ">
      THUNDER RHYTHM · PROTOTYPE 04-R8.2
    </div>

    <div style="
      font-size:26px;
      font-weight:600;
      letter-spacing:-.03em;
      color:#f7f8ff;
    ">
      2005–2026 Neon Diffuse Flow
    </div>

    <div style="
      margin-top:8px;
      font-size:11px;
      line-height:1.7;
      color:rgba(210,220,240,.55);
    ">
      RADIUS = YEAR · COLOUR = YEAR IDENTITY
      <br>
      THICKNESS / BRIGHTNESS = ANNUAL TOTAL
      <br>
      FLOWING LOCAL ENERGY = MONTHLY TOTAL
      <br>
      2005 &amp; 2026 = PARTIAL COVERAGE
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


  if (
    THREE.SRGBColorSpace
  ) {
    renderer.outputColorSpace =
      THREE.SRGBColorSpace;
  }


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


  scene.add(
    masterMotif
  );


  resize();
}


/* =========================================================
   YEAR PARTICLE GEOMETRY
   ========================================================= */

function createYearParticleGeometry() {
  const geometry =
    new THREE.BufferGeometry();


  const positions =
    new Float32Array(
      YEAR_PARTICLE_COUNT *
      3
    );


  const phases =
    new Float32Array(
      YEAR_PARTICLE_COUNT
    );


  const seeds =
    new Float32Array(
      YEAR_PARTICLE_COUNT
    );


  for (
    let i = 0;
    i < YEAR_PARTICLE_COUNT;
    i += 1
  ) {
    const regular =
      (
        i /
        YEAR_PARTICLE_COUNT
      ) *
      Math.PI *
      2;


    const offset =
      Math.sin(
        i *
        12.9898
      ) *
      YEAR_PHASE_OFFSET;


    phases[i] =
      regular +
      offset;


    seeds[i] =
      (
        Math.sin(
          i *
          78.233 +
          19.19
        ) +
        1
      ) *
      0.5;
  }


  geometry.setAttribute(
    "position",

    new THREE.BufferAttribute(
      positions,
      3
    )
  );


  geometry.setAttribute(
    "aPhase",

    new THREE.BufferAttribute(
      phases,
      1
    )
  );


  geometry.setAttribute(
    "aSeed",

    new THREE.BufferAttribute(
      seeds,
      1
    )
  );


  return geometry;
}


/* =========================================================
   MONTH UNIFORMS
   ========================================================= */

function createMonthUniforms(
  monthlyStrengths
) {
  const uniforms =
    {};


  for (
    let i = 0;
    i < MONTH_COUNT;
    i += 1
  ) {
    uniforms[
      `uMonth${i}`
    ] = {
      value:
        monthlyStrengths[i] ||
        0
    };
  }


  return uniforms;
}


/* =========================================================
   MONTHLY ENERGY FIELD GLSL
   ========================================================= */

const MONTH_FIELD_GLSL = `

  uniform float uMonth0;
  uniform float uMonth1;
  uniform float uMonth2;
  uniform float uMonth3;
  uniform float uMonth4;
  uniform float uMonth5;
  uniform float uMonth6;
  uniform float uMonth7;
  uniform float uMonth8;
  uniform float uMonth9;
  uniform float uMonth10;
  uniform float uMonth11;


  float circularDistance(
    float a,
    float b
  ) {

    float d =
      abs(
        a -
        b
      );


    return min(
      d,
      1.0 -
      d
    );
  }


  float monthWeight(
    float t,
    float centre
  ) {

    float d =
      circularDistance(
        t,
        centre
      );


    return 1.0 -
      smoothstep(
        0.035,
        0.115,
        d
      );
  }


  float getMonthField(
    float angle
  ) {

    float tau =
      6.28318530718;


    float t =
      fract(
        angle /
        tau
      );


    float sum =
      0.0;


    float totalWeight =
      0.0;


    float w0 = monthWeight(t, 0.0416667);
    float w1 = monthWeight(t, 0.1250000);
    float w2 = monthWeight(t, 0.2083333);
    float w3 = monthWeight(t, 0.2916667);
    float w4 = monthWeight(t, 0.3750000);
    float w5 = monthWeight(t, 0.4583333);
    float w6 = monthWeight(t, 0.5416667);
    float w7 = monthWeight(t, 0.6250000);
    float w8 = monthWeight(t, 0.7083333);
    float w9 = monthWeight(t, 0.7916667);
    float w10 = monthWeight(t, 0.8750000);
    float w11 = monthWeight(t, 0.9583333);


    sum += uMonth0 * w0;
    sum += uMonth1 * w1;
    sum += uMonth2 * w2;
    sum += uMonth3 * w3;
    sum += uMonth4 * w4;
    sum += uMonth5 * w5;
    sum += uMonth6 * w6;
    sum += uMonth7 * w7;
    sum += uMonth8 * w8;
    sum += uMonth9 * w9;
    sum += uMonth10 * w10;
    sum += uMonth11 * w11;


    totalWeight += w0;
    totalWeight += w1;
    totalWeight += w2;
    totalWeight += w3;
    totalWeight += w4;
    totalWeight += w5;
    totalWeight += w6;
    totalWeight += w7;
    totalWeight += w8;
    totalWeight += w9;
    totalWeight += w10;
    totalWeight += w11;


    return sum /
      max(
        totalWeight,
        0.0001
      );
  }

`;


/* =========================================================
   SHARED FLOW FIELD
   ========================================================= */

const FLOW_FIELD_GLSL = `

  float getFlow(
    float angle,
    float time,
    float seed
  ) {

    float pulseA =
      0.5 +
      0.5 *
      sin(
        angle *
          5.0 -
        time *
          1.60 +
        seed *
          1.9
      );


    float pulseB =
      0.5 +
      0.5 *
      sin(
        angle *
          11.0 +
        time *
          0.82 +
        seed *
          3.7
      );


    float travel =
      0.5 +
      0.5 *
      sin(
        angle *
          3.0 -
        time *
          2.15
      );


    return
      0.13 +

      pow(
        pulseA,
        7.0
      ) *
        0.44 +

      pow(
        pulseB,
        10.0
      ) *
        0.28 +

      pow(
        travel,
        9.0
      ) *
        0.55;
  }

`;


/* =========================================================
   YEAR SOFT BODY MATERIAL
   ========================================================= */

function createYearCoreMaterial(
  radius,
  annualStrength,
  monthlyStrengths,
  baseColour,
  accentColour
) {
  return new THREE.ShaderMaterial({

    uniforms: {
      uTime: {
        value:
          0
      },

      uRadius: {
        value:
          radius
      },

      uAnnualStrength: {
        value:
          annualStrength
      },

      uBaseColour: {
        value:
          baseColour
      },

      uAccentColour: {
        value:
          accentColour
      },

      ...createMonthUniforms(
        monthlyStrengths
      )
    },


    vertexShader: `

      uniform float uTime;
      uniform float uRadius;
      uniform float uAnnualStrength;

      attribute float aPhase;
      attribute float aSeed;

      varying float vMonthly;
      varying float vFlow;
      varying float vHot;


      ${MONTH_FIELD_GLSL}

      ${FLOW_FIELD_GLSL}


      void main() {

        float angle =
          aPhase +

          uTime *
            0.205 +

          sin(
            uTime *
              0.46 +
            aSeed *
              6.2831853
          ) *
            0.012;


        float monthly =
          getMonthField(
            angle
          );


        float flow =
          getFlow(
            angle,
            uTime,
            aSeed
          );


        float hot =
          clamp(
            monthly *
              0.54 +
            flow *
              0.66,

            0.0,
            1.4
          );


        vec3 p =
          vec3(
            cos(angle) *
              uRadius,

            sin(angle) *
              uRadius,

            0.0
          );


        vec4 mvPosition =
          modelViewMatrix *
          vec4(
            p,
            1.0
          );


        float annualThickness =
          mix(
            0.82,
            1.10,
            uAnnualStrength
          );


        float monthlyThickness =
          mix(
            0.80,
            1.18,
            monthly
          );


        float flowExpansion =
          mix(
            0.90,
            1.20,
            smoothstep(
              0.38,
              1.10,
              hot
            )
          );


        gl_PointSize =
          (
            0.34 +
            monthly *
              0.34 +
            flow *
              0.28
          ) *

          annualThickness *
          monthlyThickness *
          flowExpansion *

          (
            145.0 /
            -mvPosition.z
          );


        gl_Position =
          projectionMatrix *
          mvPosition;


        vMonthly =
          monthly;


        vFlow =
          flow;


        vHot =
          hot;
      }

    `,


    fragmentShader: `

      precision highp float;

      uniform float uAnnualStrength;

      uniform vec3 uBaseColour;
      uniform vec3 uAccentColour;

      varying float vMonthly;
      varying float vFlow;
      varying float vHot;


      void main() {

        vec2 p =
          gl_PointCoord -
          vec2(0.5);


        float d =
          length(p);


        /*
         * Gaussian luminous body.
         *
         * No visible circular edge.
         */
        float softBody =
          exp(
            -d *
            d *
            10.5
          );


        /*
         * Wider low-density body.
         */
        float outerBody =
          exp(
            -d *
            d *
            5.8
          );


        /*
         * Tiny hot centre.
         *
         * Still soft — not a solid disc.
         */
        float innerGlow =
          exp(
            -d *
            d *
            32.0
          );


        float colourMix =
          clamp(
            0.14 +
            vMonthly *
              0.40 +
            vFlow *
              0.30,

            0.0,
            1.0
          );


        vec3 colour =
          mix(
            uBaseColour,
            uAccentColour,
            colourMix
          );


        float hotAmount =
          smoothstep(
            0.50,
            1.18,
            vHot
          );


        colour =
          mix(
            colour,
            vec3(1.0),

            innerGlow *
            hotAmount *
              0.62
          );


        float annualBrightness =
          mix(
            0.78,
            1.00,
            uAnnualStrength
          );


        float localBrightness =
          0.68 +
          vMonthly *
            0.20 +
          vFlow *
            0.25;


        colour *=
          annualBrightness *
          localBrightness;


        /*
         * Soft luminous body.
         *
         * There is no hard silhouette.
         */
        float alpha =
          outerBody *
          (
            0.08 +
            vMonthly *
              0.045 +
            vFlow *
              0.065
          ) +

          softBody *
          (
            0.14 +
            vMonthly *
              0.08 +
            vFlow *
              0.12
          ) +

          innerGlow *
          hotAmount *
            0.16;


        if (
          alpha <
          0.006
        ) {
          discard;
        }


        gl_FragColor =
          vec4(
            colour,
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
      THREE.NormalBlending
  });
}


/* =========================================================
   YEAR DIFFUSE HALO MATERIAL
   ========================================================= */

function createYearHaloMaterial(
  radius,
  annualStrength,
  monthlyStrengths,
  baseColour,
  accentColour
) {
  return new THREE.ShaderMaterial({

    uniforms: {
      uTime: {
        value:
          0
      },

      uRadius: {
        value:
          radius
      },

      uAnnualStrength: {
        value:
          annualStrength
      },

      uBaseColour: {
        value:
          baseColour
      },

      uAccentColour: {
        value:
          accentColour
      },

      ...createMonthUniforms(
        monthlyStrengths
      )
    },


    vertexShader: `

      uniform float uTime;
      uniform float uRadius;
      uniform float uAnnualStrength;

      attribute float aPhase;
      attribute float aSeed;

      varying float vMonthly;
      varying float vFlow;
      varying float vGlowHot;


      ${MONTH_FIELD_GLSL}

      ${FLOW_FIELD_GLSL}


      void main() {

        float angle =
          aPhase +

          uTime *
            0.205 +

          sin(
            uTime *
              0.46 +
            aSeed *
              6.2831853
          ) *
            0.012;


        float monthly =
          getMonthField(
            angle
          );


        float flow =
          getFlow(
            angle,
            uTime,
            aSeed
          );


        float glowHot =
          smoothstep(
            0.42,
            1.02,

            flow +
            monthly *
              0.42
          );


        vec3 p =
          vec3(
            cos(angle) *
              uRadius,

            sin(angle) *
              uRadius,

            0.0
          );


        vec4 mvPosition =
          modelViewMatrix *
          vec4(
            p,
            1.0
          );


        float annualThickness =
          mix(
            0.82,
            1.12,
            uAnnualStrength
          );


        float monthlyThickness =
          mix(
            0.82,
            1.22,
            monthly
          );


        /*
         * Bright flow clusters expand
         * into soft luminous clouds.
         */
        float clusterExpansion =
          mix(
            0.82,
            1.56,
            glowHot
          );


        gl_PointSize =
          (
            0.90 +
            monthly *
              0.70 +
            flow *
              0.80
          ) *

          annualThickness *
          monthlyThickness *
          clusterExpansion *

          (
            145.0 /
            -mvPosition.z
          );


        gl_Position =
          projectionMatrix *
          mvPosition;


        vMonthly =
          monthly;


        vFlow =
          flow;


        vGlowHot =
          glowHot;
      }

    `,


    fragmentShader: `

      precision highp float;

      uniform float uAnnualStrength;

      uniform vec3 uBaseColour;
      uniform vec3 uAccentColour;

      varying float vMonthly;
      varying float vFlow;
      varying float vGlowHot;


      void main() {

        vec2 p =
          gl_PointCoord -
          vec2(0.5);


        float d =
          length(p);


        /*
         * Main diffuse glow.
         */
        float diffuseGlow =
          exp(
            -d *
            d *
            4.2
          );


        /*
         * Very wide atmospheric bloom.
         */
        float wideGlow =
          exp(
            -d *
            d *
            2.15
          );


        /*
         * Slightly concentrated centre,
         * but still completely soft.
         */
        float centralGlow =
          exp(
            -d *
            d *
            12.0
          );


        float colourMix =
          clamp(
            0.18 +
            vMonthly *
              0.42 +
            vFlow *
              0.34,

            0.0,
            1.0
          );


        vec3 colour =
          mix(
            uBaseColour,
            uAccentColour,
            colourMix
          );


        colour =
          mix(
            colour,
            vec3(1.0),

            centralGlow *
            vGlowHot *
              0.18
          );


        /*
         * Most particles produce only
         * a subtle haze.
         *
         * Strong travelling pulses are
         * allowed to bloom.
         */
        float alpha =
          diffuseGlow *
          (
            0.0018 +
            vMonthly *
              0.0045 +
            vFlow *
              0.0065 +
            vGlowHot *
              0.034
          ) +

          wideGlow *
          vGlowHot *
            0.009 +

          centralGlow *
          vGlowHot *
            0.010;


        alpha *=
          0.80 +
          uAnnualStrength *
            0.20;


        if (
          alpha <
          0.001
        ) {
          discard;
        }


        gl_FragColor =
          vec4(
            colour,
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
}


/* =========================================================
   PEAK-DAY FLARES
   ========================================================= */

function createPeakFlares(
  parent,
  year,
  radius,
  baseColour,
  accentColour
) {
  const records =
    recordsByYear.get(
      year
    ) ||
    [];


  const peaks =
    [...records]

      .filter(
        record =>
          record.value >
          0
      )

      .sort(
        (a, b) =>
          b.value -
          a.value
      )

      .slice(
        0,
        PEAK_FLARE_COUNT
      );


  if (
    !peaks.length
  ) {
    return null;
  }


  const positions =
    new Float32Array(
      peaks.length *
      3
    );


  const phases =
    new Float32Array(
      peaks.length
    );


  const strengths =
    new Float32Array(
      peaks.length
    );


  const yearDays =
    daysInYear(
      year
    );


  peaks.forEach(
    (
      record,
      index
    ) => {

      const doy =
        dayOfYear(
          year,
          record.month,
          record.day
        );


      phases[index] =
        (
          (
            doy -
            1
          ) /
          yearDays
        ) *
        Math.PI *
        2;


      strengths[index] =
        normaliseWithCap(
          record.value,
          dailyLogCap
        );
    }
  );


  const geometry =
    new THREE.BufferGeometry();


  geometry.setAttribute(
    "position",

    new THREE.BufferAttribute(
      positions,
      3
    )
  );


  geometry.setAttribute(
    "aPhase",

    new THREE.BufferAttribute(
      phases,
      1
    )
  );


  geometry.setAttribute(
    "aStrength",

    new THREE.BufferAttribute(
      strengths,
      1
    )
  );


  const material =
    new THREE.ShaderMaterial({

      uniforms: {
        uTime: {
          value:
            0
        },

        uRadius: {
          value:
            radius
        },

        uBaseColour: {
          value:
            baseColour
        },

        uAccentColour: {
          value:
            accentColour
        }
      },


      vertexShader: `

        uniform float uTime;
        uniform float uRadius;

        attribute float aPhase;
        attribute float aStrength;

        varying float vStrength;
        varying float vPulse;


        void main() {

          float angle =
            aPhase +
            uTime *
              0.205;


          float pulse =
            0.5 +
            0.5 *
            sin(
              uTime *
                2.25 +
              aPhase *
                9.0
            );


          vec3 p =
            vec3(
              cos(angle) *
                uRadius,

              sin(angle) *
                uRadius,

              0.0
            );


          vec4 mvPosition =
            modelViewMatrix *
            vec4(
              p,
              1.0
            );


          gl_PointSize =
            (
              0.92 +
              aStrength *
                1.30 +
              pulse *
                0.55
            ) *
            (
              145.0 /
              -mvPosition.z
            );


          gl_Position =
            projectionMatrix *
            mvPosition;


          vStrength =
            aStrength;


          vPulse =
            pulse;
        }

      `,


      fragmentShader: `

        precision highp float;

        uniform vec3 uBaseColour;
        uniform vec3 uAccentColour;

        varying float vStrength;
        varying float vPulse;


        void main() {

          vec2 p =
            gl_PointCoord -
            vec2(0.5);


          float d =
            length(p);


          float brightGlow =
            exp(
              -d *
              d *
              13.0
            );


          float diffuseGlow =
            exp(
              -d *
              d *
              4.0
            );


          float wideGlow =
            exp(
              -d *
              d *
              1.8
            );


          vec3 colour =
            mix(
              uAccentColour,
              vec3(1.0),

              0.38 +
              vStrength *
                0.42
            );


          float alpha =
            brightGlow *
              (
                0.30 +
                vStrength *
                  0.26
              ) +

            diffuseGlow *
              (
                0.018 +
                vPulse *
                  0.035
              ) +

            wideGlow *
              vPulse *
                0.010;


          if (
            alpha <
            0.002
          ) {
            discard;
          }


          gl_FragColor =
            vec4(
              colour,
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


  const points =
    new THREE.Points(
      geometry,
      material
    );


  points.frustumCulled =
    false;


  parent.add(
    points
  );


  return material;
}


/* =========================================================
   BUILD ONE YEAR RHYTHM
   ========================================================= */

function createYearRhythm(
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


  const annualStats =
    annualStatsByYear.get(
      year
    ) ||
    {
      total:
        0,

      strength:
        0,

      partial:
        false
    };


  const monthlyStats =
    monthlyStatsByYear.get(
      year
    ) ||
    {
      totals:
        Array(
          MONTH_COUNT
        ).fill(
          0
        ),

      strengths:
        Array(
          MONTH_COUNT
        ).fill(
          0
        )
    };


  const colours =
    yearColours(
      yearIndex
    );


  const wrapper =
    new THREE.Group();


  const geometry =
    createYearParticleGeometry();


  /*
   * Diffuse atmospheric halo.
   */
  const haloMaterial =
    createYearHaloMaterial(
      radius,
      annualStats.strength,
      monthlyStats.strengths,
      colours.base,
      colours.accent
    );


  const haloPoints =
    new THREE.Points(
      geometry,
      haloMaterial
    );


  haloPoints.frustumCulled =
    false;


  haloPoints.renderOrder =
    yearIndex *
    3;


  wrapper.add(
    haloPoints
  );


  /*
   * Soft luminous body.
   */
  const coreMaterial =
    createYearCoreMaterial(
      radius,
      annualStats.strength,
      monthlyStats.strengths,
      colours.base,
      colours.accent
    );


  const corePoints =
    new THREE.Points(
      geometry,
      coreMaterial
    );


  corePoints.frustumCulled =
    false;


  corePoints.renderOrder =
    yearIndex *
      3 +
    1;


  wrapper.add(
    corePoints
  );


  /*
   * Sparse strongest Daily events.
   */
  const flareMaterial =
    createPeakFlares(
      wrapper,
      year,
      radius,
      colours.base,
      colours.accent
    );


  const initialY =
    initialYearPhase(
      yearIndex
    );


  const rotationSpeed =
    yearRotationSpeed(
      yearIndex
    );


  wrapper.rotation.y =
    initialY;


  masterMotif.add(
    wrapper
  );


  yearSystems.push({
    year,

    yearIndex,

    radius,

    wrapper,

    annualTotal:
      annualStats.total,

    annualStrength:
      annualStats.strength,

    partial:
      annualStats.partial,

    monthlyTotals:
      monthlyStats.totals,

    monthlyStrengths:
      monthlyStats.strengths,

    coreMaterial,

    haloMaterial,

    flareMaterial,

    initialY,

    rotationSpeed
  });
}


/* =========================================================
   BUILD ALL 22 YEARS
   ========================================================= */

function buildYearRhythms() {
  YEARS.forEach(
    (
      year,
      yearIndex
    ) => {

      createYearRhythm(
        year,
        yearIndex
      );
    }
  );


  console.log(
    "R8.2 Neon Diffuse Year Rhythms built:",
    yearSystems.length
  );


  console.log(
    "Chronology:",
    "2005 inner → 2026 outer"
  );
}


/* =========================================================
   UPDATE
   ========================================================= */

function updateYearRhythms(
  time
) {
  yearSystems.forEach(
    system => {

      system.coreMaterial
        .uniforms
        .uTime
        .value =
          time;


      system.haloMaterial
        .uniforms
        .uTime
        .value =
          time;


      if (
        system.flareMaterial
      ) {
        system.flareMaterial
          .uniforms
          .uTime
          .value =
            time;
      }


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
   CAMERA
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


  updateYearRhythms(
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


  buildYearRhythms();


  attachInteraction();


  window.addEventListener(
    "resize",
    resize
  );


  requestAnimationFrame(
    animate
  );


  console.log(
    "Thunder Rhythm R8.2 Neon Diffuse Flow ready."
  );
}


initialisePrototype()
  .catch(error => {

    console.error(
      "R8.2 Neon Diffuse Flow error:",
      error
    );
  });