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



const yearHitTargets =

  [];





/* =========================================================

   INTERACTION

   ========================================================= */



let manualMasterY =

  0;



let raycaster =

  null;



let pointerNdc =

  null;



let hoverTooltip =

  null;



let detailPanel =

  null;



let overviewLabel =

  null;



let interactionHint =

  null;



let viewMode =

  "overview";



let selectedYear =

  null;



let hoveredYear =

  null;



const pointer = {

  down:

    false,



  x:

    0,



  y:

    0,



  startX:

    0,



  startY:

    0,



  moved:

    false

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





  overviewLabel =

    document.createElement(

      "div"

    );





  overviewLabel.innerHTML = `

    <div style="

      font-size:10px;

      letter-spacing:.22em;

      color:rgba(180,220,255,.58);

      margin-bottom:8px;

    ">

      THUNDER RHYTHM · INTERACTIVE TEMPORAL VIEW

    </div>



    <div style="

      font-size:26px;

      font-weight:600;

      letter-spacing:-.03em;

      color:#f7f8ff;

    ">

      Hong Kong Lightning · 2005–2026

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

      2005 & 2026 = PARTIAL COVERAGE

    </div>

  `;





  Object.assign(

    overviewLabel.style,



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

    overviewLabel

  );





  interactionHint =

    document.createElement(

      "div"

    );





  interactionHint.textContent =

    "HOVER A YEAR · CLICK TO OPEN · DRAG HORIZONTALLY · SCROLL TO ZOOM";





  Object.assign(

    interactionHint.style,



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

    interactionHint

  );





  hoverTooltip =

    document.createElement(

      "div"

    );



  Object.assign(

    hoverTooltip.style,



    {

      position:

        "absolute",



      zIndex:

        "8",



      minWidth:

        "150px",



      padding:

        "10px 12px",



      border:

        "1px solid rgba(255,235,140,.30)",



      borderRadius:

        "10px",



      background:

        "rgba(2,3,6,.88)",



      boxShadow:

        "0 0 24px rgba(255,220,80,.10)",



      color:

        "#fffbe8",



      fontFamily:

        "Arial, Helvetica, sans-serif",



      pointerEvents:

        "none",



      opacity:

        "0",



      transform:

        "translateY(4px)",



      transition:

        "opacity 90ms ease, transform 90ms ease"

    }

  );



  stage.appendChild(

    hoverTooltip

  );





  detailPanel =

    document.createElement(

      "div"

    );



  Object.assign(

    detailPanel.style,



    {

      position:

        "absolute",



      top:

        "30px",



      left:

        "36px",



      zIndex:

        "9",



      width:

        "260px",



      maxHeight:

        "calc(100% - 60px)",



      overflow:

        "auto",



      padding:

        "16px 17px",



      border:

        "1px solid rgba(255,235,140,.20)",



      borderRadius:

        "14px",



      background:

        "rgba(2,3,6,.78)",



      backdropFilter:

        "blur(8px)",



      color:

        "#f7f8ff",



      fontFamily:

        "Arial, Helvetica, sans-serif",



      display:

        "none",



      pointerEvents:

        "auto"

    }

  );



  detailPanel.addEventListener(

    "pointerdown",



    event =>

      event.stopPropagation()

  );



  detailPanel.addEventListener(

    "wheel",



    event =>

      event.stopPropagation()

  );



  stage.appendChild(

    detailPanel

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





  raycaster =

    new THREE.Raycaster();



  pointerNdc =

    new THREE.Vector2();





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

    uDetailScale: {
      value:
        1.0
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
    uniform float uDetailScale;



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

          ) * uDetailScale;





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

    uDetailScale: {
      value:
        1.0
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
    uniform float uDetailScale;



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

          ) * uDetailScale;





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





  const hitGeometry =

    new THREE.TorusGeometry(

      radius,

      0.045,

      6,

      180

    );



  const hitMaterial =

    new THREE.MeshBasicMaterial({

      color:

        0xffffff,



      transparent:

        true,



      opacity:

        0,



      depthWrite:

        false,



      depthTest:

        false,



      side:

        THREE.DoubleSide

    });



  const hitTarget =

    new THREE.Mesh(

      hitGeometry,

      hitMaterial

    );



  hitTarget.userData.year =

    year;



  hitTarget.renderOrder =

    -10;



  wrapper.add(

    hitTarget

  );



  yearHitTargets.push(

    hitTarget

  );





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



    hitTarget,



    initialY,



    rotationSpeed

  });

}





/* =========================================================

   BUILD ALL 22 YEARS

   ========================================================= */




/* =========================================================
   2025 YEAR DETAIL · PROTOTYPE 03.1 MONTH RIPPLE SYSTEMS

   TEST ONLY 2025 BEFORE GENERALISING TO EVERY YEAR

   Structure:
   selected 2025 Year orbit
        ↓
   12 Month modules
        ↓
   each Month = 28–31 concentric Daily rings

   Day 01 = innermost ring
   Last day = outermost ring

   Visual behaviour preserved from Prototype 03.1:
   - month circulation around Year
   - tangent-aligned Month planes
   - daily ripple depth
   - breathing
   - diffuse glow

   Colour adapted to current 2025 Year identity:
   bright gold → pale yellow → white-hot peak
   ========================================================= */

const YEAR_DETAIL_2025_RADIUS =
  2.0;

const YEAR_DETAIL_MONTH_INNER_RADIUS =
  0.050;

const YEAR_DETAIL_MONTH_OUTER_RADIUS =
  0.42;

const YEAR_DETAIL_RIPPLE_INNER_AMPLITUDE =
  0.055;

const YEAR_DETAIL_RIPPLE_OUTER_AMPLITUDE =
  0.135;


const YEAR_DETAIL_MONTH_NAMES = [
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


let yearDetail2025Group =
  null;

let yearDetail2025System =
  null;

let yearDetail2025MonthOrbitOffset =
  0;

const yearDetail2025MonthSystems =
  [];


/* =========================================================
   THUNDER_2025_LEVEL3_V2

   LEVEL 2
   YEAR → MONTH

   LEVEL 3
   MONTH → DAY
   ========================================================= */

let selectedMonth =
  null;

let hoveredMonth =
  null;

let hoveredDay =
  null;


/*
 * Manual rotation is added
 * on top of automatic motion.
 */
let yearDetailManualYaw =
  0;

let yearDetailManualPitch =
  0;


/*
 * Level 3 state.
 */
let monthDetail2025Group =
  null;

let monthDetail2025State =
  null;

const monthDetail2025DayHitTargets =
  [];


/* =========================================================
   DETAIL ROTATION

   The selected Year ring and its
   12 Month modules must rotate
   as one hierarchy.
   ========================================================= */

function sync2025DetailRotation(
  time
) {

  /*
   * Stop the old Overview master
   * rotation in both detail modes.
   */
  if (
    selectedYear ===
      2025 &&
    (
      viewMode ===
        "year" ||
      viewMode ===
        "month"
    )
  ) {

    masterMotif.rotation.x =
      0;

    masterMotif.rotation.y =
      0;

    masterMotif.rotation.z =
      0;

  }


  if (
    viewMode !==
      "year" ||
    selectedYear !==
      2025
  ) {
    return;
  }


  const rotationX =
    0.70 +
    yearDetailManualPitch +

    Math.sin(
      time *
        0.12
    ) *
      0.10;


  const rotationY =
    -0.30 +
    yearDetailManualYaw +

    time *
      0.087;


  const rotationZ =
    0.12 +

    Math.cos(
      time *
        0.09
    ) *
      0.075;


  if (
    yearDetail2025System
  ) {

    yearDetail2025System
      .wrapper
      .rotation
      .set(

        rotationX,
        rotationY,
        rotationZ

      );

  }


  if (
    yearDetail2025Group
  ) {

    yearDetail2025Group
      .rotation
      .set(

        rotationX,
        rotationY,
        rotationZ

      );

  }

}


/* =========================================================
   GENERIC DETAIL RAYCAST
   ========================================================= */

function detailObjectAtPointer(
  event,
  targets
) {

  if (
    !raycaster ||
    !pointerNdc ||
    !renderer ||
    !camera ||
    !targets ||
    !targets.length
  ) {
    return null;
  }


  const rect =
    renderer
      .domElement
      .getBoundingClientRect();


  pointerNdc.x =
    (
      (
        event.clientX -
        rect.left
      ) /
      Math.max(
        1,
        rect.width
      )
    ) *
      2 -
    1;


  pointerNdc.y =
    -(
      (
        event.clientY -
        rect.top
      ) /
      Math.max(
        1,
        rect.height
      )
    ) *
      2 +
    1;


  scene.updateMatrixWorld(
    true
  );


  raycaster.setFromCamera(
    pointerNdc,
    camera
  );


  const hits =
    raycaster.intersectObjects(
      targets,
      false
    );


  if (
    !hits.length
  ) {
    return null;
  }


  return hits[0].object;

}


/* =========================================================
   MONTH / DAY TOOLTIP
   ========================================================= */

function showDetailTooltip(
  event,
  kicker,
  title,
  dataLabel,
  value
) {

  if (
    !hoverTooltip
  ) {
    return;
  }


  hoverTooltip.innerHTML = `
    <div style="
      font-size:8px;
      letter-spacing:.16em;
      color:rgba(220,225,240,.46);
      margin-bottom:5px;
    ">
      ${kicker}
    </div>

    <div style="
      font-size:19px;
      font-weight:600;
      letter-spacing:-.02em;
      color:#fffcef;
      margin-bottom:9px;
    ">
      ${title}
    </div>

    <div style="
      font-size:8px;
      letter-spacing:.14em;
      color:rgba(220,225,240,.48);
      margin-bottom:3px;
    ">
      ${dataLabel}
    </div>

    <div style="
      font-size:14px;
      font-weight:600;
      color:#ffe56c;
      font-variant-numeric:tabular-nums;
    ">
      ${formatLightningCount(
        value
      )}
    </div>
  `;


  hoverTooltip.style.opacity =
    "1";

  hoverTooltip.style.transform =
    "translateY(0)";


  const tooltipWidth =
    175;

  const tooltipHeight =
    110;


  let left =
    event.clientX +
    18;


  let top =
    event.clientY +
    14;


  if (
    left +
    tooltipWidth >
    window.innerWidth -
      10
  ) {

    left =
      event.clientX -
      tooltipWidth -
      18;

  }


  if (
    top +
    tooltipHeight >
    window.innerHeight -
      10
  ) {

    top =
      event.clientY -
      tooltipHeight -
      12;

  }


  hoverTooltip.style.left =
    `${Math.max(
      10,
      left
    )}px`;


  hoverTooltip.style.top =
    `${Math.max(
      10,
      top
    )}px`;

}


/* =========================================================
   LEVEL 2 MONTH HIT TEST
   ========================================================= */

function monthAtPointer(
  event
) {

  if (
    viewMode !==
      "year" ||
    selectedYear !==
      2025
  ) {
    return null;
  }


  const targets =
    yearDetail2025MonthSystems

      .map(
        month =>
          month.hitTarget
      )

      .filter(Boolean);


  const target =
    detailObjectAtPointer(
      event,
      targets
    );


  if (
    !target
  ) {
    return null;
  }


  const monthNumber =
    target.userData
      .month;


  return (
    yearDetail2025MonthSystems
      .find(
        month =>
          month.month ===
          monthNumber
      ) ||
    null
  );

}


function updateMonthHover(
  event
) {

  if (
    viewMode !==
      "year" ||
    selectedYear !==
      2025 ||
    pointer.down
  ) {

    hideYearTooltip();

    return;
  }


  const month =
    monthAtPointer(
      event
    );


  if (
    !month
  ) {

    hoveredMonth =
      null;


    hideYearTooltip();


    stage.style.cursor =
      "grab";


    return;

  }


  hoveredMonth =
    month.month;


  const stats =
    monthlyStatsByYear.get(
      2025
    );


  const value =
    stats
      ?.totals[
        month.month -
        1
      ] ||
    0;


  showDetailTooltip(
    event,

    "MONTH",

    `${month.name} 2025`,

    "MONTHLY LIGHTNING",

    value
  );


  stage.style.cursor =
    "pointer";

}


/* =========================================================
   LEVEL 3 DAY HIT TEST
   ========================================================= */

function dayAtPointer(
  event
) {

  if (
    viewMode !==
      "month" ||
    selectedYear !==
      2025
  ) {
    return null;
  }


  const target =
    detailObjectAtPointer(
      event,
      monthDetail2025DayHitTargets
    );


  if (
    !target
  ) {
    return null;
  }


  return (
    target.userData
      .dayData ||
    null
  );

}


function updateDayHover(
  event
) {

  if (
    viewMode !==
      "month" ||
    selectedYear !==
      2025
  ) {

    hideYearTooltip();

    return;
  }


  const day =
    dayAtPointer(
      event
    );


  if (
    !day
  ) {

    hoveredDay =
      null;


    hideYearTooltip();


    stage.style.cursor =
      "default";


    return;

  }


  hoveredDay =
    day.day;


  const monthName =
    YEAR_DETAIL_MONTH_NAMES[
      selectedMonth -
      1
    ];


  const dayLabel =
    String(
      day.day
    ).padStart(
      2,
      "0"
    );


  showDetailTooltip(
    event,

    "DAY",

    `${dayLabel} ${monthName} 2025`,

    "DAILY LIGHTNING",

    day.value
  );


  stage.style.cursor =
    "pointer";

}


/* =========================================================
   LEVEL 3 LEFT PANEL
   ========================================================= */

function render2025MonthDetailPanel(
  monthNumber
) {

  if (
    !detailPanel
  ) {
    return;
  }


  const monthName =
    YEAR_DETAIL_MONTH_NAMES[
      monthNumber -
      1
    ];


  const records =
    (
      recordsByYear.get(
        2025
      ) ||
      []
    )

      .filter(
        record =>
          record.month ===
          monthNumber
      );


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


  const rows =
    records

      .map(
        record => {

          const day =
            String(
              record.day
            ).padStart(
              2,
              "0"
            );


          return `
            <div style="
              display:flex;
              justify-content:space-between;
              gap:12px;
              padding:4px 0;
              border-bottom:
                1px solid
                rgba(255,255,255,.045);
              font-size:9px;
              font-variant-numeric:
                tabular-nums;
            ">

              <span style="
                color:
                  rgba(220,225,240,.52);
              ">
                ${day}
              </span>

              <span style="
                color:
                  rgba(255,244,195,.88);
              ">
                ${formatLightningCount(
                  record.value
                )}
              </span>

            </div>
          `;

        }
      )

      .join("");


  detailPanel.innerHTML = `
    <div style="
      display:flex;
      align-items:center;
      flex-wrap:wrap;
      gap:13px;
      margin-bottom:15px;
    ">

      <button
        id="thunder-back-year-2025"
        style="
          appearance:none;
          border:0;
          background:none;
          padding:0;
          color:
            rgba(235,238,250,.72);
          font:inherit;
          font-size:9px;
          letter-spacing:.12em;
          cursor:pointer;
        "
      >
        ← 2025 YEAR
      </button>


      <button
        id="thunder-back-all-years"
        style="
          appearance:none;
          border:0;
          background:none;
          padding:0;
          color:
            rgba(235,238,250,.40);
          font:inherit;
          font-size:8px;
          letter-spacing:.10em;
          cursor:pointer;
        "
      >
        ALL YEARS
      </button>

    </div>


    <div style="
      font-size:9px;
      letter-spacing:.15em;
      color:rgba(220,225,240,.43);
      margin-bottom:5px;
    ">
      SELECTED MONTH
    </div>


    <div style="
      font-size:25px;
      font-weight:600;
      letter-spacing:-.03em;
      color:#f9f9ff;
      margin-bottom:16px;
    ">
      ${monthName} 2025
    </div>


    <div style="
      display:flex;
      justify-content:space-between;
      gap:12px;
      font-size:9px;
      margin-bottom:4px;
    ">

      <span style="
        color:rgba(220,225,240,.52);
        letter-spacing:.10em;
      ">
        MONTHLY TOTAL
      </span>

      <span style="
        color:#ffe56c;
        font-weight:600;
        font-variant-numeric:tabular-nums;
      ">
        ${formatLightningCount(
          total
        )}
      </span>

    </div>


    <div style="
      font-size:8px;
      letter-spacing:.10em;
      color:rgba(220,225,240,.38);
      margin-bottom:13px;
    ">
      DAILY LIGHTNING COUNTS
    </div>


    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      column-gap:18px;
    ">
      ${rows}
    </div>
  `;


  detailPanel
    .querySelector(
      "#thunder-back-year-2025"
    )
    ?.addEventListener(
      "click",

      event => {

        event.stopPropagation();

        exit2025MonthView();

      }
    );


  detailPanel
    .querySelector(
      "#thunder-back-all-years"
    )
    ?.addEventListener(
      "click",

      event => {

        event.stopPropagation();

        clear2025MonthDetail();

        exitYearView();

      }
    );

}


/* =========================================================
   CREATE ONE LARGE MONTH VISUALISATION
   ========================================================= */

function clear2025MonthDetail() {

  if (
    monthDetail2025Group
  ) {

    masterMotif.remove(
      monthDetail2025Group
    );


    disposeYearDetailObject(
      monthDetail2025Group
    );

  }


  monthDetail2025Group =
    null;


  monthDetail2025State =
    null;


  monthDetail2025DayHitTargets
    .length =
      0;

}


function create2025MonthDetail(
  monthNumber
) {

  clear2025MonthDetail();


  const allRecords =
    recordsByYear.get(
      2025
    ) ||
    [];


  const records =
    allRecords.filter(
      record =>
        record.month ===
        monthNumber
    );


  const calendarDays =
    yearDetailDaysInMonth(
      2025,
      monthNumber
    );


  const localDailyLogCap =
    calculateYearDetailDailyLogCap(
      allRecords
    );


  monthDetail2025Group =
    new THREE.Group();


  /*
   * Large angled Month plane.
   */
  monthDetail2025Group
    .rotation
    .set(
      0.78,
      -0.24,
      0.10
    );


  monthDetail2025Group
    .position
    .x =
      0.28;


  masterMotif.add(
    monthDetail2025Group
  );


  const days =
    [];


  records.forEach(
    record => {

      const intensity =
        normaliseYearDetailLightning(
          record.value,
          localDailyLogCap
        );


      const level =
        yearDetailIntensityLevel(
          intensity
        );


      /*
       * Calendar date controls radius.
       */
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


      /*
       * Much larger than Level 2.
       */
      const ringRadius =
        lerp(
          0.20,
          2.03,
          radialT
        );


      const colourDay =
        yearDetail2025Colour(
          monthNumber -
            1,
          intensity
        );


      const dayRoot =
        new THREE.Group();


      const ring =
        new THREE.Mesh(

          new THREE.TorusGeometry(

            ringRadius,

            yearDetailDayTubeRadius(
              level
            ) *
              1.60,

            8,
            128

          ),

          new THREE.MeshBasicMaterial({

            color:
              colourDay,

            transparent:
              true,

            opacity:
              yearDetailDayOpacity(
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

          })

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

        haloRing =
          new THREE.Mesh(

            new THREE.TorusGeometry(

              ringRadius,

              yearDetailDayTubeRadius(
                level
              ) *
                4.2,

              8,
              128

            ),

            new THREE.MeshBasicMaterial({

              color:
                colourDay,

              transparent:
                true,

              opacity:
                yearDetailGlowOpacity(
                  level
                ) *
                  1.10,

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

        outerHaloRing =
          new THREE.Mesh(

            new THREE.TorusGeometry(

              ringRadius,

              yearDetailDayTubeRadius(
                level
              ) *
                7.0,

              8,
              128

            ),

            new THREE.MeshBasicMaterial({

              color:
                colourDay,

              transparent:
                true,

              opacity:
                level ===
                  4

                  ? 0.050

                  : 0.024,

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


      /*
       * Invisible thicker Daily ring
       * for easy hover detection.
       */
      const hitTarget =
        new THREE.Mesh(

          new THREE.TorusGeometry(

            ringRadius,

            0.027,

            6,
            128

          ),

          new THREE.MeshBasicMaterial({

            transparent:
              true,

            opacity:
              0.001,

            depthWrite:
              false,

            depthTest:
              false

          })

        );


      const dayData = {

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

        hitTarget,

        phase:
          record.day *
            0.43 +

          (
            monthNumber -
            1
          ) *
            0.71

      };


      hitTarget.userData = {

        kind:
          "day",

        dayData

      };


      dayRoot.add(
        hitTarget
      );


      monthDetail2025DayHitTargets
        .push(
          hitTarget
        );


      monthDetail2025Group.add(
        dayRoot
      );


      days.push(
        dayData
      );

    }
  );


  monthDetail2025State = {

    month:
      monthNumber,

    calendarDays,

    days

  };

}


/* =========================================================
   LEVEL 3 MONTH MOTION
   ========================================================= */

function update2025MonthDetail(
  time
) {

  if (
    viewMode !==
      "month" ||
    selectedYear !==
      2025 ||
    !monthDetail2025Group ||
    !monthDetail2025State
  ) {
    return;
  }


  monthDetail2025State
    .days
    .forEach(
      day => {

        const amplitude =
          lerp(
            0.035,
            0.145,
            day.radialT
          );


        const wave =
          Math.sin(

            time *
              1.42 +

            day.phase

          );


        day.root.position.z =
          wave *
          amplitude;


        const breathe =
          1 +

          Math.sin(

            time *
              0.45 +

            day.phase

          ) *
            0.005;


        day.root.scale.setScalar(
          breathe
        );


        if (
          day.haloRing
        ) {

          day.haloRing
            .scale
            .setScalar(

              1 +

              Math.sin(

                time *
                  0.80 +

                day.phase

              ) *
                0.024

            );

        }


        if (
          day.outerHaloRing
        ) {

          day.outerHaloRing
            .scale
            .setScalar(

              1 +

              Math.sin(

                time *
                  0.62 +

                day.phase +
                0.7

              ) *
                0.032

            );

        }

      }
    );


  /*
   * Very subtle floating angle.
   */
  monthDetail2025Group
    .rotation
    .y =
      -0.24 +

      Math.sin(
        time *
          0.16
      ) *
        0.055;


  monthDetail2025Group
    .rotation
    .z =
      0.10 +

      Math.cos(
        time *
          0.13
      ) *
        0.030;

}


/* =========================================================
   ENTER / EXIT LEVEL 3
   ========================================================= */

function enter2025MonthView(
  monthNumber
) {

  if (
    selectedYear !==
      2025
  ) {
    return;
  }


  selectedMonth =
    monthNumber;


  hoveredMonth =
    null;


  hoveredDay =
    null;


  hideYearTooltip();


  viewMode =
    "month";


  yearSystems.forEach(
    system => {

      if (
        system.year ===
        2025
      ) {

        system.wrapper.visible =
          false;

      }

    }
  );


  if (
    yearDetail2025Group
  ) {

    yearDetail2025Group.visible =
      false;

  }


  create2025MonthDetail(
    monthNumber
  );


  render2025MonthDetailPanel(
    monthNumber
  );


  interactionHint.textContent =
    "MONTH DETAIL · HOVER A DAILY RING";


  updateThunderMonthChart(
    2025,
    monthNumber
  );


  showThunderBackButton(
    "month"
  );


  stage.style.cursor =
    "default";

}


function exit2025MonthView() {

  clear2025MonthDetail();


  selectedMonth =
    null;


  hoveredDay =
    null;


  viewMode =
    "year";


  yearSystems.forEach(
    system => {

      if (
        system.year ===
        2025
      ) {

        system.wrapper.visible =
          true;

      }

    }
  );


  if (
    yearDetail2025Group
  ) {

    yearDetail2025Group.visible =
      true;

  }


  if (
    yearDetail2025System
  ) {

    renderYearDetailPanel(
      yearDetail2025System
    );

  }


  interactionHint.textContent =
    "2025 YEAR DETAIL · HOVER / CLICK A MONTH · DRAG TO ROTATE";


  updateThunderYearChart(
    2025
  );


  showThunderBackButton(
    "year"
  );


  stage.style.cursor =
    "grab";

}




/* =========================================================
   2025 DETAIL HELPERS
   ========================================================= */

function yearDetailDaysInMonth(
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


function calculateYearDetailDailyLogCap(
  records
) {
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
          a - b
      );


  if (
    !values.length
  ) {
    return 1;
  }


  /*
   * Same 98th-percentile strategy
   * used in Prototype 03.1.
   */
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


function normaliseYearDetailLightning(
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


function yearDetailIntensityLevel(
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


function yearDetailDayTubeRadius(
  level
) {
  return [
    0.00160,
    0.00220,
    0.00310,
    0.00460,
    0.00680
  ][level];
}


function yearDetailDayOpacity(
  level
) {
  return [
    0.080,
    0.18,
    0.36,
    0.66,
    0.96
  ][level];
}


function yearDetailGlowOpacity(
  level
) {
  return [
    0.000,
    0.000,
    0.035,
    0.085,
    0.170
  ][level];
}


/* =========================================================
   2025 GOLD COLOUR SYSTEM

   Base:
   current 2025 Year colour

   Weak days:
   bright / warm gold

   Medium:
   pale yellow

   Strong:
   yellow-white

   Peak:
   white-hot
   ========================================================= */

function yearDetail2025Colour(
  monthIndex,
  intensity
) {
  const pair =
    YEAR_COLOUR_PAIRS[
      2025 -
      START_YEAR
    ];


  const base =
    new THREE.Color(
      pair[0]
    );


  const accent =
    new THREE.Color(
      pair[1]
    );


  const monthT =
    monthIndex /
    Math.max(
      1,
      MONTH_COUNT -
      1
    );


  /*
   * All 12 Months stay inside
   * the 2025 gold identity.
   *
   * Earlier Months:
   * slightly richer gold.
   *
   * Later Months:
   * slightly paler yellow.
   */
  const monthColour =
    base
      .clone()
      .lerp(
        accent,

        0.10 +
          monthT *
            0.42
      );


  /*
   * Strong Daily lightning
   * approaches white-hot light.
   */
  return monthColour.lerp(
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
   CLEANUP
   ========================================================= */

function disposeYearDetailObject(
  object
) {
  object.traverse(
    child => {

      if (
        child.geometry
      ) {
        child.geometry
          .dispose?.();
      }


      if (
        child.material
      ) {

        if (
          Array.isArray(
            child.material
          )
        ) {

          child.material
            .forEach(
              material =>
                material
                  .dispose?.()
            );

        } else {

          child.material
            .dispose?.();

        }

      }

    }
  );
}


function clear2025YearDetail() {

  if (
    yearDetail2025Group
  ) {

    masterMotif.remove(
      yearDetail2025Group
    );


    disposeYearDetailObject(
      yearDetail2025Group
    );

  }


  yearDetail2025Group =
    null;


  yearDetail2025System =
    null;


  yearDetail2025MonthOrbitOffset =
    0;


  yearDetail2025MonthSystems.length =
    0;

}


/* =========================================================
   BUILD 2025 MONTH RIPPLE SYSTEMS
   ========================================================= */

function create2025YearDetail(
  system
) {

  clear2025YearDetail();


  if (
    !system ||
    system.year !==
      2025
  ) {
    return;
  }


  const records2025 =
    recordsByYear.get(
      2025
    ) ||
    [];


  /*
   * Preserve Prototype 03.1
   * 98th-percentile Daily scaling.
   */
  const localDailyLogCap =
    calculateYearDetailDailyLogCap(
      records2025
    );


  yearDetail2025System =
    system;


  yearDetail2025Group =
    new THREE.Group();


  masterMotif.add(
    yearDetail2025Group
  );


  /*
   * Build:
   * 12 Months
   * ×
   * actual 28–31 Daily records.
   */
  for (
    let monthIndex = 0;
    monthIndex <
      MONTH_COUNT;
    monthIndex += 1
  ) {

    const monthNumber =
      monthIndex +
      1;


    const calendarDays =
      yearDetailDaysInMonth(
        2025,
        monthNumber
      );


    const monthRecords =
      records2025.filter(
        record =>
          record.month ===
          monthNumber
      );


    const monthRoot =
      new THREE.Group();


    /*
     * Invisible interaction volume.
     *
     * Month visual outer radius = 0.42
     * Hit sphere radius = 0.47
     */
    const monthHitTarget =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          0.47,
          12,
          8
        ),

        new THREE.MeshBasicMaterial({

          transparent:
            true,

          opacity:
            0.001,

          depthWrite:
            false,

          depthTest:
            false

        })

      );


    monthHitTarget.userData = {

      kind:
        "month",

      month:
        monthNumber,

      monthIndex

    };


    monthRoot.add(
      monthHitTarget
    );


    const days =
      [];


    monthRecords.forEach(
      record => {

        const intensity =
          normaliseYearDetailLightning(
            record.value,
            localDailyLogCap
          );


        const level =
          yearDetailIntensityLevel(
            intensity
          );


        /*
         * Day chronology → radius.
         *
         * Day 01 = innermost.
         * Last date = outermost.
         */
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
            YEAR_DETAIL_MONTH_INNER_RADIUS,
            YEAR_DETAIL_MONTH_OUTER_RADIUS,
            radialT
          );


        const colourDay =
          yearDetail2025Colour(
            monthIndex,
            intensity
          );


        const dayRoot =
          new THREE.Group();


        /* -----------------------------------------------
           DAILY CORE RING
           ----------------------------------------------- */

        const geometry =
          new THREE.TorusGeometry(
            ringRadius,

            yearDetailDayTubeRadius(
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
              yearDetailDayOpacity(
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


        /* -----------------------------------------------
           DIFFUSE GLOW
           ----------------------------------------------- */

        let haloRing =
          null;


        if (
          level >=
          2
        ) {

          const haloGeometry =
            new THREE.TorusGeometry(

              ringRadius,

              yearDetailDayTubeRadius(
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
                  yearDetailGlowOpacity(
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


        /* -----------------------------------------------
           SECONDARY SOFT HALO
           ----------------------------------------------- */

        let outerHaloRing =
          null;


        if (
          level >=
          3
        ) {

          const outerHaloGeometry =
            new THREE.TorusGeometry(

              ringRadius,

              yearDetailDayTubeRadius(
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

                    ? 0.045

                    : 0.022,

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


          /*
           * Same delayed temporal phase
           * used in Prototype 03.1.
           */
          phase:
            record.day *
              0.43 +

            monthIndex *
              0.71

        });

      }
    );


    yearDetail2025Group.add(
      monthRoot
    );


    yearDetail2025MonthSystems.push({

      index:
        monthIndex,

      month:
        monthNumber,

      name:
        YEAR_DETAIL_MONTH_NAMES[
          monthIndex
        ],

      root:
        monthRoot,

      days,

      calendarDays,

      hitTarget:
        monthHitTarget,


      /*
       * JAN → DEC distributed evenly
       * around the Year orbit.
       */
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
    "2025 Level 2 detail built:",

    yearDetail2025MonthSystems.length,

    "Month ripple systems ·",

    yearDetail2025MonthSystems.reduce(
      (
        total,
        month
      ) =>
        total +
        month.days.length,

      0
    ),

    "Daily rings"
  );

}


/* =========================================================
   UPDATE 2025 MONTH SYSTEM
   ========================================================= */

function update2025YearDetail(
  time
) {

  if (
    !yearDetail2025Group ||
    !yearDetail2025System ||
    viewMode !==
      "year" ||
    selectedYear !==
      2025
  ) {
    return;
  }


  /*
   * Same Month circulation speed
   * as Prototype 03.1.
   */
  yearDetail2025MonthOrbitOffset =
    time *
    0.075;


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


  yearDetail2025MonthSystems.forEach(
    month => {

      /*
       * 12 Month centres remain
       * evenly spaced around Year.
       */
      const monthAngle =
        month.baseAngle +
        yearDetail2025MonthOrbitOffset;


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
          YEAR_DETAIL_2025_RADIUS,

        sinMonth *
          YEAR_DETAIL_2025_RADIUS,

        0

      );


      /*
       * Month ripple plane sits
       * perpendicular to tangent
       * of Year orbit.
       */
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


      /*
       * Floating Month orientation.
       */
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


      /* -----------------------------------------------
         DAILY RIPPLE
         ----------------------------------------------- */

      month.days.forEach(
        day => {

          const amplitude =
            lerp(

              YEAR_DETAIL_RIPPLE_INNER_AMPLITUDE,

              YEAR_DETAIL_RIPPLE_OUTER_AMPLITUDE,

              day.radialT

            );


          const wave =
            Math.sin(

              time *
                1.55 +

              day.phase

            );


          /*
           * Outer Daily rings move
           * more strongly than inner rings.
           */
          day.root.position.z =
            wave *
            amplitude;


          /*
           * Tiny breathing.
           */
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


          /*
           * Halo shimmer.
           */
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


          /*
           * Secondary outer halo.
           */
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


  /*
   * Whole hierarchy motion preserved
   * from Prototype 03.1.
   */
  const rotationX =
    0.70 +

    Math.sin(
      time *
      0.12
    ) *
      0.10;


  const rotationY =
    -0.30 +

    time *
      0.087;


  const rotationZ =
    0.12 +

    Math.cos(
      time *
      0.09
    ) *
      0.075;


  yearDetail2025Group.rotation.set(

    rotationX,

    rotationY,

    rotationZ

  );

}


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


      /*
       * Selected Year detail.
       */
      if (
        viewMode ===
          "year" &&
        system.year ===
          selectedYear
      ) {

        /*
         * Only 2025 currently receives
         * the complete Prototype 03.1
         * hierarchy test.
         */
        if (
          selectedYear ===
          2025
        ) {

          system.wrapper.rotation.x =
            0.70 +

            Math.sin(
              time *
              0.12
            ) *
              0.10;


          system.wrapper.rotation.y =
            -0.30 +

            time *
              0.087;


          system.wrapper.rotation.z =
            0.12 +

            Math.cos(
              time *
              0.09
            ) *
              0.075;

        } else {

          system.wrapper.rotation.x =
            0;

          system.wrapper.rotation.y =
            0;

          system.wrapper.rotation.z =
            0;

        }

      } else {

        /*
         * Original 22-Year overview motion.
         */
        system.wrapper.rotation.x =
          0;


        system.wrapper.rotation.z =
          0;


        system.wrapper.rotation.y =
          system.initialY +

          time *
            system.rotationSpeed;

      }

    }
  );


  masterMotif.rotation.x =
    0;


  masterMotif.rotation.z =
    0;


  if (
    viewMode ===
      "year"
  ) {

    masterMotif.rotation.y =
      0;

  } else {

    masterMotif.rotation.y =
      manualMasterY +

      time *
        MASTER_Y_SPEED;

  }

}


/* =========================================================
   INTERACTION
   ========================================================= */


function formatLightningCount(

  value

) {

  return Math.round(

    value || 0

  ).toLocaleString(

    "en-US"

  );

}





function systemAtPointer(

  event

) {

  if (

    !raycaster ||

    !pointerNdc ||

    !renderer ||

    !camera

  ) {

    return null;

  }





  const rect =

    renderer.domElement

      .getBoundingClientRect();





  pointerNdc.x =

    (

      (

        event.clientX -

        rect.left

      ) /

      Math.max(

        1,

        rect.width

      )

    ) *

      2 -

    1;





  pointerNdc.y =

    -(

      (

        event.clientY -

        rect.top

      ) /

      Math.max(

        1,

        rect.height

      )

    ) *

      2 +

    1;





  scene.updateMatrixWorld(

    true

  );





  raycaster.setFromCamera(

    pointerNdc,

    camera

  );





  const hits =

    raycaster.intersectObjects(

      yearHitTargets,

      false

    );





  if (

    !hits.length

  ) {

    return null;

  }





  const year =

    hits[0]

      .object

      .userData

      .year;





  return (

    yearSystems.find(

      system =>

        system.year ===

        year

    ) ||

    null

  );

}





function hideYearTooltip() {

  hoveredYear =

    null;



  if (

    !hoverTooltip

  ) {

    return;

  }



  hoverTooltip.style.opacity =

    "0";



  hoverTooltip.style.transform =

    "translateY(4px)";

}





function showYearTooltip(

  event,

  system

) {

  if (

    !hoverTooltip ||

    !system

  ) {

    return;

  }





  hoveredYear =

    system.year;





  const partialText =

    system.partial

      ? `<div style="
          margin-top:5px;
          font-size:9px;
          letter-spacing:.12em;
          color:rgba(255,225,140,.65);
        ">PARTIAL COVERAGE</div>`

      : "";





  hoverTooltip.innerHTML = `

    <div style="
      font-size:10px;
      letter-spacing:.16em;
      color:rgba(215,225,245,.58);
      margin-bottom:4px;
    ">
      YEAR
    </div>

    <div style="
      font-size:20px;
      font-weight:600;
      color:#fffdf0;
      margin-bottom:8px;
    ">
      ${system.year}
    </div>

    <div style="
      font-size:9px;
      letter-spacing:.12em;
      color:rgba(215,225,245,.52);
      margin-bottom:3px;
    ">
      ANNUAL LIGHTNING
    </div>

    <div style="
      font-size:15px;
      font-weight:600;
      color:#ffe56c;
    ">
      ${formatLightningCount(
        system.annualTotal
      )}
    </div>

    ${partialText}

  `;





  const tooltipWidth =

    180;



  const tooltipHeight =

    system.partial

      ? 108

      : 90;





  const left =

    Math.min(

      event.clientX +

        18,



      window.innerWidth -

        tooltipWidth -

        12

    );





  const top =

    Math.min(

      event.clientY +

        14,



      window.innerHeight -

        tooltipHeight -

        12

    );





  hoverTooltip.style.left =

    `${Math.max(
      10,
      left
    )}px`;





  hoverTooltip.style.top =

    `${Math.max(
      10,
      top
    )}px`;





  hoverTooltip.style.opacity =

    "1";



  hoverTooltip.style.transform =

    "translateY(0)";
}





function updateYearHover(

  event

) {

  if (

    viewMode !==

      "overview" ||

    pointer.down

  ) {

    hideYearTooltip();

    return;

  }





  const system =

    systemAtPointer(

      event

    );





  if (

    system

  ) {

    showYearTooltip(

      event,

      system

    );



    stage.style.cursor =

      "pointer";

  } else {

    hideYearTooltip();



    stage.style.cursor =

      "grab";

  }

}





function renderYearDetailPanel(

  system

) {

  if (

    !detailPanel ||

    !system

  ) {

    return;

  }





  const monthRows =

    system.monthlyTotals

      .map(

        (

          value,

          index

        ) => {

          const monthName =

            [

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

            ][index];



          return `

            <div style="
              display:flex;
              justify-content:space-between;
              gap:16px;
              padding:4px 0;
              border-bottom:1px solid rgba(255,255,255,.045);
              font-size:10px;
            ">

              <span style="
                color:rgba(220,225,240,.58);
                letter-spacing:.10em;
              ">
                ${monthName}
              </span>

              <span style="
                color:rgba(255,245,200,.86);
                font-variant-numeric:tabular-nums;
              ">
                ${formatLightningCount(
                  value
                )}
              </span>

            </div>

          `;

        }

      )

      .join("");





  detailPanel.innerHTML = `

    <button
      type="button"
      id="thunder-back-years"
      style="
        appearance:none;
        border:0;
        padding:0;
        margin:0 0 16px 0;
        background:transparent;
        color:rgba(225,232,248,.68);
        font:600 10px Arial, Helvetica, sans-serif;
        letter-spacing:.13em;
        cursor:pointer;
      "
    >
      ← ALL YEARS
    </button>

    <div style="
      font-size:9px;
      letter-spacing:.16em;
      color:rgba(220,225,240,.48);
      margin-bottom:5px;
    ">
      SELECTED YEAR
    </div>

    <div style="
      font-size:30px;
      font-weight:600;
      letter-spacing:-.03em;
      color:#fffdf2;
      margin-bottom:14px;
    ">
      ${system.year}
    </div>

    <div style="
      display:flex;
      justify-content:space-between;
      gap:14px;
      margin-bottom:6px;
      font-size:10px;
    ">
      <span style="
        color:rgba(220,225,240,.52);
        letter-spacing:.10em;
      ">
        ANNUAL TOTAL
      </span>

      <span style="
        color:#ffe56c;
        font-weight:600;
        font-variant-numeric:tabular-nums;
      ">
        ${formatLightningCount(
          system.annualTotal
        )}
      </span>
    </div>

    <div style="
      font-size:9px;
      line-height:1.5;
      letter-spacing:.10em;
      color:${system.partial
        ? "rgba(255,225,140,.70)"
        : "rgba(190,220,205,.62)"};
      margin-bottom:16px;
    ">
      ${system.partial
        ? "PARTIAL COVERAGE"
        : "FULL-YEAR COVERAGE"}
    </div>

    <div style="
      font-size:9px;
      letter-spacing:.15em;
      color:rgba(220,225,240,.45);
      margin-bottom:6px;
    ">
      MONTHLY LIGHTNING TOTALS
    </div>

    ${monthRows}

  `;





  const backButton =

    detailPanel.querySelector(

      "#thunder-back-years"

    );





  backButton?.addEventListener(

    "click",



    event => {

      event.stopPropagation();



      exitYearView();

    }

  );

}






function enterYearView(
  system
) {

  if (
    !system
  ) {
    return;
  }


  viewMode =
    "year";


  selectedYear =
    system.year;


  hideYearTooltip();


  /*
   * Detail view uses larger particles
   * without changing Year radius.
   */
  yearSystems.forEach(
    candidate => {

      const active =
        candidate.year ===
        selectedYear;


      if (
        candidate.coreMaterial
          ?.uniforms
          ?.uDetailScale
      ) {

        candidate.coreMaterial
          .uniforms
          .uDetailScale
          .value =

            active
              ? 1.48
              : 1.0;

      }


      if (
        candidate.haloMaterial
          ?.uniforms
          ?.uDetailScale
      ) {

        candidate.haloMaterial
          .uniforms
          .uDetailScale
          .value =

            active
              ? 1.30
              : 1.0;

      }

    }
  );


  if (
    selectedYear ===
    2025
  ) {

    yearDetailManualYaw =
      0;


    yearDetailManualPitch =
      0;

  }


  /*
   * Keep only selected Year visible.
   */
  yearSystems.forEach(
    candidate => {

      candidate.wrapper.visible =
        candidate.year ===
        selectedYear;


      candidate.wrapper.scale.setScalar(

        candidate.year ===
          selectedYear

          ? 2.0 /
            Math.max(
              0.001,
              candidate.radius
            )

          : 1

      );

    }
  );


  /*
   * TEST STAGE:
   *
   * Only 2025 receives
   * the complete Month hierarchy.
   */
  if (
    selectedYear ===
    2025
  ) {

    create2025YearDetail(
      system
    );


    interactionHint.textContent =
      "2025 YEAR DETAIL · HOVER / CLICK A MONTH · DRAG TO ROTATE";

  } else {

    clear2025YearDetail();


    interactionHint.textContent =
      "YEAR DETAIL · 2025 MONTH SYSTEM TEST ONLY";

  }


  overviewLabel.style.display =
    "none";


  detailPanel.style.display =
    "block";


  renderYearDetailPanel(
    system
  );


  updateThunderYearChart(
    system.year
  );


  showThunderBackButton(
    "year"
  );


  stage.style.cursor =
    "default";

}



function exitYearView() {

  hideThunderDetailOverlay();

  clear2025MonthDetail();


  clear2025YearDetail();


  selectedMonth =
    null;


  hoveredMonth =
    null;


  hoveredDay =
    null;


  yearSystems.forEach(
    system => {

      if (
        system.coreMaterial
          ?.uniforms
          ?.uDetailScale
      ) {

        system.coreMaterial
          .uniforms
          .uDetailScale
          .value =
            1.0;

      }


      if (
        system.haloMaterial
          ?.uniforms
          ?.uDetailScale
      ) {

        system.haloMaterial
          .uniforms
          .uDetailScale
          .value =
            1.0;

      }

    }
  );


  viewMode =
    "overview";


  selectedYear =
    null;


  yearSystems.forEach(
    system => {

      system.wrapper.visible =
        true;


      system.wrapper.scale.setScalar(
        1
      );

    }
  );


  detailPanel.style.display =
    "none";


  overviewLabel.style.display =
    "block";


  interactionHint.textContent =
    "HOVER A YEAR · CLICK TO OPEN · DRAG HORIZONTALLY · SCROLL TO ZOOM";


  stage.style.cursor =
    "grab";

}



/* =========================================================
   THUNDER_DETAIL_CHART_BACK_V1

   DETAIL NAVIGATION + MINI BAR CHART

   LEVEL 2:
   Year → Jan–Dec monthly bars

   LEVEL 3:
   Month → Daily bars
   ========================================================= */

let thunderDetailChart =
  null;

let thunderDetailBackButton =
  null;


/* =========================================================
   COLOUR HELPERS
   ========================================================= */

function thunderColourToCss(
  colourNumber
) {

  return (
    "#" +
    colourNumber
      .toString(16)
      .padStart(
        6,
        "0"
      )
  );

}


/* =========================================================
   CREATE OVERLAY UI
   ========================================================= */

function ensureThunderDetailOverlay() {

  if (
    !stage
  ) {
    return;
  }


  /* -------------------------
     RIGHT-BOTTOM BAR CHART
     ------------------------- */

  if (
    !thunderDetailChart
  ) {

    thunderDetailChart =
      document.createElement(
        "div"
      );


    thunderDetailChart.id =
      "thunder-detail-chart";


    Object.assign(
      thunderDetailChart.style,

      {
        position:
          "absolute",

        right:
          "28px",

        bottom:
          "28px",

        zIndex:
          "7",

        width:
          "330px",

        maxWidth:
          "calc(100vw - 80px)",

        padding:
          "12px 13px 10px",

        boxSizing:
          "border-box",

        border:
          "1px solid rgba(255,235,160,.10)",

        borderRadius:
          "8px",

        background:
          "rgba(2,3,6,.60)",

        backdropFilter:
          "blur(6px)",

        fontFamily:
          "Arial, Helvetica, sans-serif",

        color:
          "#f8f8ff",

        pointerEvents:
          "none",

        display:
          "none"
      }

    );


    stage.appendChild(
      thunderDetailChart
    );

  }


  /* -------------------------
     LEFT-BOTTOM BACK BUTTON
     ------------------------- */

  if (
    !thunderDetailBackButton
  ) {

    thunderDetailBackButton =
      document.createElement(
        "button"
      );


    thunderDetailBackButton.type =
      "button";


    thunderDetailBackButton.id =
      "thunder-detail-back";


    Object.assign(
      thunderDetailBackButton.style,

      {
        position:
          "absolute",

        left:
          "36px",

        bottom:
          "28px",

        zIndex:
          "20",

        minHeight:
          "36px",

        padding:
          "8px 13px",

        border:
          "1px solid rgba(220,225,245,.16)",

        borderRadius:
          "999px",

        background:
          "rgba(2,3,6,.72)",

        backdropFilter:
          "blur(7px)",

        color:
          "rgba(238,240,250,.78)",

        fontFamily:
          "Arial, Helvetica, sans-serif",

        fontSize:
          "9px",

        letterSpacing:
          ".13em",

        cursor:
          "pointer",

        display:
          "none",

        appearance:
          "none"
      }

    );


    /*
     * Do not let scene dragging
     * capture this button.
     */
    thunderDetailBackButton
      .addEventListener(

        "pointerdown",

        event => {

          event.stopPropagation();

        }

      );


    thunderDetailBackButton
      .addEventListener(

        "click",

        event => {

          event.stopPropagation();


          /*
           * LEVEL 3
           * Month → Year
           */
          if (
            viewMode ===
              "month"
          ) {

            exit2025MonthView();

            return;
          }


          /*
           * LEVEL 2
           * Year → All Years
           */
          if (
            viewMode ===
              "year"
          ) {

            exitYearView();

          }

        }

      );


    stage.appendChild(
      thunderDetailBackButton
    );

  }

}


/* =========================================================
   BACK BUTTON STATE
   ========================================================= */

function showThunderBackButton(
  mode
) {

  ensureThunderDetailOverlay();


  if (
    !thunderDetailBackButton
  ) {
    return;
  }


  if (
    mode ===
      "month"
  ) {

    thunderDetailBackButton
      .textContent =
        "← 2025 YEAR";

  } else {

    thunderDetailBackButton
      .textContent =
        "← ALL YEARS";

  }


  thunderDetailBackButton
    .style
    .display =
      "block";

}


function hideThunderDetailOverlay() {

  if (
    thunderDetailChart
  ) {

    thunderDetailChart
      .style
      .display =
        "none";

  }


  if (
    thunderDetailBackButton
  ) {

    thunderDetailBackButton
      .style
      .display =
        "none";

  }

}


/* =========================================================
   MINI BAR CHART
   ========================================================= */

function renderThunderBarChart(
  {
    title,
    subtitle,
    labels,
    values,
    year
  }
) {

  ensureThunderDetailOverlay();


  if (
    !thunderDetailChart
  ) {
    return;
  }


  const safeValues =
    values.map(
      value =>
        Number.isFinite(
          value
        )
          ? Math.max(
              0,
              value
            )
          : 0
    );


  const maximum =
    Math.max(
      1,
      ...safeValues
    );


  const yearIndex =
    clamp(
      year -
        START_YEAR,
      0,
      YEAR_COUNT -
        1
    );


  const pair =
    YEAR_COLOUR_PAIRS[
      yearIndex
    ];


  const baseColour =
    thunderColourToCss(
      pair[0]
    );


  const accentColour =
    thunderColourToCss(
      pair[1]
    );


  /*
   * SVG coordinate system.
   */
  const width =
    306;

  const height =
    94;

  const left =
    4;

  const right =
    4;

  const top =
    7;

  const bottom =
    19;


  const plotWidth =
    width -
    left -
    right;


  const plotHeight =
    height -
    top -
    bottom;


  const count =
    Math.max(
      1,
      safeValues.length
    );


  const slot =
    plotWidth /
    count;


  /*
   * 12 Month bars can be wider.
   * 28–31 Daily bars remain thin.
   */
  const barWidth =
    count <=
      12

      ? Math.max(
          5,
          slot *
            0.48
        )

      : Math.max(
          2.0,
          slot *
            0.42
        );


  const bars =
    safeValues
      .map(
        (
          value,
          index
        ) => {

          const ratio =
            value /
            maximum;


          const barHeight =
            ratio *
            plotHeight;


          const x =
            left +
            index *
              slot +
            (
              slot -
              barWidth
            ) /
              2;


          const y =
            top +
            plotHeight -
            barHeight;


          /*
           * Strongest bars approach
           * Year accent / white.
           */
          const opacity =
            0.28 +
            ratio *
              0.72;


          return `
            <rect
              x="${x.toFixed(2)}"
              y="${y.toFixed(2)}"
              width="${barWidth.toFixed(2)}"
              height="${Math.max(
                0,
                barHeight
              ).toFixed(2)}"
              rx="${Math.min(
                1.2,
                barWidth /
                  3
              ).toFixed(2)}"
              fill="${ratio > 0.72
                ? accentColour
                : baseColour}"
              opacity="${opacity.toFixed(3)}"
            />
          `;

        }
      )
      .join("");


  /*
   * X-axis labels.
   *
   * Year:
   * JAN ... DEC
   *
   * Month:
   * 01 / 05 / 10 / ...
   */
  const labelSvg =
    labels
      .map(
        (
          label,
          index
        ) => {

          let visible =
            true;


          if (
            count >
            12
          ) {

            const day =
              index +
              1;


            visible =
              day ===
                1 ||
              day ===
                count ||
              day %
                5 ===
                0;

          }


          if (
            !visible
          ) {
            return "";
          }


          const x =
            left +
            index *
              slot +
            slot /
              2;


          return `
            <text
              x="${x.toFixed(2)}"
              y="${height - 4}"
              text-anchor="middle"
              font-size="${count <= 12 ? 5.7 : 5.2}"
              fill="rgba(220,225,240,.42)"
              font-family="Arial, Helvetica, sans-serif"
            >
              ${label}
            </text>
          `;

        }
      )
      .join("");


  thunderDetailChart.innerHTML = `
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:10px;
      margin-bottom:3px;
    ">

      <div>

        <div style="
          font-size:8px;
          letter-spacing:.14em;
          color:rgba(220,225,240,.44);
          margin-bottom:3px;
        ">
          ${subtitle}
        </div>

        <div style="
          font-size:11px;
          font-weight:600;
          letter-spacing:.02em;
          color:rgba(248,248,255,.88);
        ">
          ${title}
        </div>

      </div>


      <div style="
        font-size:7px;
        letter-spacing:.10em;
        color:rgba(220,225,240,.34);
        text-align:right;
        padding-top:2px;
      ">
        MAX<br>
        ${formatLightningCount(
          maximum
        )}
      </div>

    </div>


    <svg
      viewBox="0 0 ${width} ${height}"
      style="
        display:block;
        width:100%;
        height:auto;
        overflow:visible;
      "
      aria-label="${title}"
    >

      <line
        x1="${left}"
        y1="${top + plotHeight}"
        x2="${width - right}"
        y2="${top + plotHeight}"
        stroke="rgba(220,225,240,.14)"
        stroke-width=".65"
      />

      ${bars}

      ${labelSvg}

    </svg>
  `;


  thunderDetailChart
    .style
    .display =
      "block";

}


/* =========================================================
   YEAR CHART
   JAN → DEC
   ========================================================= */

function updateThunderYearChart(
  year
) {

  const stats =
    monthlyStatsByYear.get(
      year
    );


  if (
    !stats
  ) {
    return;
  }


  renderThunderBarChart({

    title:
      `${year} MONTHLY RHYTHM`,

    subtitle:
      "MONTHLY LIGHTNING",

    labels:
      [
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
      ],

    values:
      stats.totals,

    year

  });

}


/* =========================================================
   MONTH CHART
   DAY 01 → LAST DAY
   ========================================================= */

function updateThunderMonthChart(
  year,
  month
) {

  const records =
    (
      recordsByYear.get(
        year
      ) ||
      []
    )

      .filter(
        record =>
          record.month ===
          month
      );


  const calendarDays =
    yearDetailDaysInMonth(
      year,
      month
    );


  const byDay =
    new Map();


  records.forEach(
    record => {

      byDay.set(
        record.day,
        record.value
      );

    }
  );


  const values =
    Array.from(
      {
        length:
          calendarDays
      },

      (
        _,
        index
      ) =>
        byDay.has(
          index +
          1
        )

          ? byDay.get(
              index +
              1
            )

          : 0
    );


  const labels =
    Array.from(
      {
        length:
          calendarDays
      },

      (
        _,
        index
      ) =>
        String(
          index +
          1
        ).padStart(
          2,
          "0"
        )
    );


  const monthName =
    YEAR_DETAIL_MONTH_NAMES[
      month -
      1
    ];


  renderThunderBarChart({

    title:
      `${monthName} ${year} DAILY RHYTHM`,

    subtitle:
      "DAILY LIGHTNING",

    labels,

    values,

    year

  });

}

function attachInteraction() {

  stage.addEventListener(
    "pointerdown",

    event => {

      /*
       * Left UI panel owns its clicks.
       */
      if (
        event.target ===
          detailPanel ||
        detailPanel?.contains(
          event.target
        )
      ) {
        return;
      }


      /*
       * Level 3 currently uses hover,
       * not scene dragging.
       */
      if (
        viewMode ===
        "month"
      ) {
        return;
      }


      /*
       * Other Year detail views
       * are not interactive yet.
       */
      if (
        viewMode ===
          "year" &&
        selectedYear !==
          2025
      ) {
        return;
      }


      pointer.down =
        true;


      pointer.moved =
        false;


      pointer.x =
        event.clientX;


      pointer.y =
        event.clientY;


      pointer.startX =
        event.clientX;


      pointer.startY =
        event.clientY;


      hideYearTooltip();


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

      /*
       * DRAG
       */
      if (
        pointer.down
      ) {

        const dx =
          event.clientX -
          pointer.x;


        const dy =
          event.clientY -
          pointer.y;


        const totalDistance =
          Math.hypot(

            event.clientX -
              pointer.startX,

            event.clientY -
              pointer.startY

          );


        if (
          totalDistance >
          4
        ) {

          pointer.moved =
            true;

        }


        /*
         * Level 1:
         * drag whole Overview.
         */
        if (
          viewMode ===
          "overview"
        ) {

          manualMasterY +=
            dx *
            0.005;

        }


        /*
         * Level 2:
         * drag the selected 2025
         * hierarchy while automatic
         * movement keeps running.
         */
        if (
          viewMode ===
            "year" &&
          selectedYear ===
            2025
        ) {

          yearDetailManualYaw +=
            dx *
            0.005;


          yearDetailManualPitch =
            clamp(

              yearDetailManualPitch +
                dy *
                  0.004,

              -0.90,
              0.90

            );

        }


        pointer.x =
          event.clientX;


        pointer.y =
          event.clientY;


        hideYearTooltip();


        return;

      }


      /*
       * HOVER
       */
      if (
        viewMode ===
        "overview"
      ) {

        updateYearHover(
          event
        );

        return;

      }


      if (
        viewMode ===
          "year" &&
        selectedYear ===
          2025
      ) {

        updateMonthHover(
          event
        );

        return;

      }


      if (
        viewMode ===
          "month" &&
        selectedYear ===
          2025
      ) {

        updateDayHover(
          event
        );

      }

    }
  );


  stage.addEventListener(
    "pointerup",

    event => {

      if (
        !pointer.down
      ) {
        return;
      }


      const wasClick =
        !pointer.moved;


      pointer.down =
        false;


      /*
       * Level 1 click → Year.
       */
      if (
        wasClick &&
        viewMode ===
          "overview"
      ) {

        const system =
          systemAtPointer(
            event
          );


        if (
          system
        ) {

          enterYearView(
            system
          );


          return;

        }

      }


      /*
       * Level 2 click → Month.
       */
      if (
        wasClick &&
        viewMode ===
          "year" &&
        selectedYear ===
          2025
      ) {

        const month =
          monthAtPointer(
            event
          );


        if (
          month
        ) {

          enter2025MonthView(
            month.month
          );


          return;

        }

      }


      if (
        viewMode ===
        "overview"
      ) {

        stage.style.cursor =
          "grab";


        updateYearHover(
          event
        );

      }


      if (
        viewMode ===
          "year" &&
        selectedYear ===
          2025
      ) {

        stage.style.cursor =
          "grab";


        updateMonthHover(
          event
        );

      }

    }
  );


  stage.addEventListener(
    "pointercancel",

    () => {

      pointer.down =
        false;


      pointer.moved =
        false;


      hideYearTooltip();


      stage.style.cursor =
        viewMode ===
          "month"

          ? "default"

          : "grab";

    }
  );


  stage.addEventListener(
    "pointerleave",

    () => {

      if (
        !pointer.down
      ) {

        hideYearTooltip();

      }

    }
  );


  stage.addEventListener(
    "wheel",

    event => {

      if (
        event.target ===
          detailPanel ||
        detailPanel?.contains(
          event.target
        )
      ) {
        return;
      }


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

  update2025YearDetail(
    time
  );


  sync2025DetailRotation(
    time
  );


  update2025MonthDetail(
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

    "Thunder Rhythm Interactive Level 1 ready."

  );

}





initialisePrototype()

  .catch(error => {



    console.error(

      "Thunder Rhythm interactive error:",

      error

    );

  });