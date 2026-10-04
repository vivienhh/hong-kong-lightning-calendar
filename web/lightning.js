/* =========================================================

   THUNDER RHYTHM

   PROTOTYPE 04-R8.2



   Hong Kong Lightning · 2005–2026



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

      THUNDER RHYTHM

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
   ALL-YEAR DETAIL SYSTEM

   GENERALISED FROM THE STABLE 2025 PROTOTYPE

   Structure:
   selected Year
        ↓
   12 Month positions
        ↓
   each available Month = 28–31 concentric Daily rings

   Partial coverage is preserved:
   - no record ≠ zero lightning
   - missing months/days are marked NO DATA
   ========================================================= */

const YEAR_DETAIL_RADIUS =
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


let yearDetailGroup =
  null;

let yearDetailSystem =
  null;

let yearDetailMonthOrbitOffset =
  0;

const yearDetailMonthSystems =
  [];


let selectedMonth =
  null;

let hoveredMonth =
  null;

let hoveredDay =
  null;


let yearDetailManualYaw =
  0;

let yearDetailManualPitch =
  0;


let monthDetailGroup =
  null;

let monthDetailState =
  null;

const monthDetailDayHitTargets =
  [];


/* =========================================================
   COVERAGE HELPERS
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


function recordsForMonth(
  year,
  month
) {

  return (
    recordsByYear.get(
      year
    ) ||
    []
  ).filter(
    record =>
      record.month ===
      month
  );

}


function monthCoverage(
  year,
  month
) {

  const records =
    recordsForMonth(
      year,
      month
    );


  if (
    !records.length
  ) {

    return {
      state:
        "none",

      records,

      calendarDays:
        yearDetailDaysInMonth(
          year,
          month
        ),

      firstDay:
        null,

      lastDay:
        null
    };

  }


  const calendarDays =
    yearDetailDaysInMonth(
      year,
      month
    );


  const uniqueDays =
    new Set(
      records.map(
        record =>
          record.day
      )
    );


  const firstDay =
    Math.min(
      ...uniqueDays
    );


  const lastDay =
    Math.max(
      ...uniqueDays
    );


  const incompleteFlag =
    records.some(
      record =>
        record.completeness &&
        record.completeness !==
          "C"
    );


  const full =
    uniqueDays.size ===
      calendarDays &&
    firstDay ===
      1 &&
    lastDay ===
      calendarDays &&
    !incompleteFlag;


  return {
    state:
      full
        ? "full"
        : "partial",

    records,

    calendarDays,

    firstDay,

    lastDay
  };

}


function yearCoverageText(
  year
) {

  if (
    year ===
    2005
  ) {
    return "PARTIAL COVERAGE · 21 JUN–31 DEC";
  }


  if (
    year ===
    2026
  ) {
    return "PARTIAL COVERAGE · JAN–31 AUG";
  }


  return "FULL-YEAR COVERAGE";

}


/* =========================================================
   DAILY NORMALISATION
   ========================================================= */

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
   YEAR-IDENTITY DETAIL COLOUR
   ========================================================= */

function yearDetailColour(
  year,
  monthIndex,
  intensity
) {

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


  const monthColour =
    base
      .clone()
      .lerp(
        accent,

        0.10 +
          monthT *
            0.42
      );


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
   DISPOSE DETAIL OBJECTS
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


/* =========================================================
   DETAIL TOOLTIP
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


  const valueText =
    Number.isFinite(
      value
    )

      ? formatLightningCount(
          value
        )

      : String(
          value
        );


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
      ${valueText}
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
   DETAIL RAYCAST
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
   LEVEL 2 MONTH HIT TEST
   ========================================================= */

function monthAtPointer(
  event
) {

  if (
    viewMode !==
      "year" ||
    selectedYear ===
      null
  ) {
    return null;
  }


  const targets =
    yearDetailMonthSystems

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
    yearDetailMonthSystems
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
    selectedYear ===
      null ||
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


  const title =
    `${month.name} ${selectedYear}`;


  if (
    !month.available
  ) {

    showDetailTooltip(
      event,

      "MONTH",

      title,

      "COVERAGE",

      "NO DATA"
    );


    stage.style.cursor =
      "default";


    return;
  }


  showDetailTooltip(
    event,

    month.coverage ===
      "partial"

      ? "MONTH · PARTIAL COVERAGE"
      : "MONTH",

    title,

    "MONTHLY LIGHTNING",

    month.total
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
    selectedYear ===
      null
  ) {
    return null;
  }


  const target =
    detailObjectAtPointer(
      event,
      monthDetailDayHitTargets
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
    selectedYear ===
      null
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

    `${dayLabel} ${monthName} ${selectedYear}`,

    "DAILY LIGHTNING",

    day.value
  );


  stage.style.cursor =
    "pointer";

}


/* =========================================================
   CLEAR LEVEL 2
   ========================================================= */

function clearYearDetail() {

  if (
    yearDetailGroup
  ) {

    masterMotif.remove(
      yearDetailGroup
    );


    disposeYearDetailObject(
      yearDetailGroup
    );

  }


  yearDetailGroup =
    null;


  yearDetailSystem =
    null;


  yearDetailMonthOrbitOffset =
    0;


  yearDetailMonthSystems.length =
    0;

}


/* =========================================================
   BUILD SELECTED YEAR
   ========================================================= */

function createYearDetail(
  system
) {

  clearYearDetail();


  if (
    !system
  ) {
    return;
  }


  const detailYear =
    system.year;


  const yearRecords =
    recordsByYear.get(
      detailYear
    ) ||
    [];


  const localDailyLogCap =
    calculateYearDetailDailyLogCap(
      yearRecords
    );


  yearDetailSystem =
    system;


  yearDetailGroup =
    new THREE.Group();


  masterMotif.add(
    yearDetailGroup
  );


  for (
    let monthIndex = 0;
    monthIndex <
      MONTH_COUNT;
    monthIndex += 1
  ) {

    const monthNumber =
      monthIndex +
      1;


    const coverage =
      monthCoverage(
        detailYear,
        monthNumber
      );


    const monthRecords =
      coverage.records;


    const calendarDays =
      coverage.calendarDays;


    const available =
      monthRecords.length >
      0;


    const monthTotal =
      monthRecords.reduce(
        (
          sum,
          record
        ) =>
          sum +
          record.value,

        0
      );


    const monthRoot =
      new THREE.Group();


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

      monthIndex,

      available

    };


    monthRoot.add(
      monthHitTarget
    );


    const days =
      [];


    if (
      !available
    ) {

      const placeholderColour =
        yearDetailColour(
          detailYear,
          monthIndex,
          0
        );


      const placeholder =
        new THREE.Mesh(

          new THREE.TorusGeometry(
            0.24,
            0.0015,
            6,
            64
          ),

          new THREE.MeshBasicMaterial({

            color:
              placeholderColour,

            transparent:
              true,

            opacity:
              0.08,

            depthWrite:
              false,

            depthTest:
              true

          })

        );


      monthRoot.add(
        placeholder
      );

    }


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
          yearDetailColour(
            detailYear,
            monthIndex,
            intensity
          );


        const dayRoot =
          new THREE.Group();


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
                  3.2,

                7,
                64

              ),

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
                  5.5,

                7,
                64

              ),

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

          phase:
            record.day *
              0.43 +

            monthIndex *
              0.71

        });

      }
    );


    yearDetailGroup.add(
      monthRoot
    );


    yearDetailMonthSystems.push({

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

      available,

      coverage:
        coverage.state,

      total:
        monthTotal,

      firstDay:
        coverage.firstDay,

      lastDay:
        coverage.lastDay,

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
    `${detailYear} Level 2 detail built:`,

    yearDetailMonthSystems.length,

    "Month positions ·",

    yearDetailMonthSystems.reduce(
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
   UPDATE SELECTED YEAR MONTH SYSTEM
   ========================================================= */

function updateYearDetail(
  time
) {

  if (
    !yearDetailGroup ||
    !yearDetailSystem ||
    viewMode !==
      "year" ||
    selectedYear ===
      null
  ) {
    return;
  }


  yearDetailMonthOrbitOffset =
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


  yearDetailMonthSystems.forEach(
    month => {

      const monthAngle =
        month.baseAngle +
        yearDetailMonthOrbitOffset;


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
          YEAR_DETAIL_RADIUS,

        sinMonth *
          YEAR_DETAIL_RADIUS,

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

            day.haloRing
              .scale
              .setScalar(

                1 +

                Math.sin(

                  time *
                    0.82 +

                  day.phase

                ) *
                  0.026

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
                    0.63 +

                  day.phase +
                  0.7

                ) *
                  0.035

              );

          }

        }
      );

    }
  );

}


/* =========================================================
   DETAIL ROTATION
   ========================================================= */

function syncYearDetailRotation(
  time
) {

  if (
    selectedYear ===
      null ||
    (
      viewMode !==
        "year" &&
      viewMode !==
        "month"
    )
  ) {
    return;
  }


  masterMotif.rotation.x =
    0;

  masterMotif.rotation.y =
    0;

  masterMotif.rotation.z =
    0;


  if (
    viewMode !==
      "year"
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
    yearDetailSystem
  ) {

    yearDetailSystem
      .wrapper
      .rotation
      .set(

        rotationX,
        rotationY,
        rotationZ

      );

  }


  if (
    yearDetailGroup
  ) {

    yearDetailGroup
      .rotation
      .set(

        rotationX,
        rotationY,
        rotationZ

      );

  }

}


/* =========================================================
   LEVEL 3 PANEL
   ========================================================= */

function renderMonthDetailPanel(
  year,
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


  const coverage =
    monthCoverage(
      year,
      monthNumber
    );


  const records =
    coverage.records;


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


  const coverageText =
    coverage.state ===
      "partial"

      ? `PARTIAL COVERAGE · ${String(
          coverage.firstDay
        ).padStart(
          2,
          "0"
        )}–${String(
          coverage.lastDay
        ).padStart(
          2,
          "0"
        )} ${monthName}`

      : "FULL MONTH COVERAGE";


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
        id="thunder-back-selected-year"
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
        ← ${year} YEAR
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
      margin-bottom:12px;
    ">
      ${monthName} ${year}
    </div>


    <div style="
      font-size:8px;
      line-height:1.4;
      letter-spacing:.10em;
      color:${coverage.state === "partial"
        ? "rgba(255,225,140,.68)"
        : "rgba(190,220,205,.58)"};
      margin-bottom:13px;
    ">
      ${coverageText}
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
      "#thunder-back-selected-year"
    )
    ?.addEventListener(
      "click",

      event => {

        event.stopPropagation();

        exitMonthView();

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

        clearMonthDetail();

        exitYearView();

      }
    );

}


/* =========================================================
   CLEAR LEVEL 3
   ========================================================= */

function clearMonthDetail() {

  if (
    monthDetailGroup
  ) {

    masterMotif.remove(
      monthDetailGroup
    );


    disposeYearDetailObject(
      monthDetailGroup
    );

  }


  monthDetailGroup =
    null;


  monthDetailState =
    null;


  monthDetailDayHitTargets
    .length =
      0;

}


/* =========================================================
   CREATE ONE LARGE MONTH VISUALISATION
   ========================================================= */

function createMonthDetail(
  year,
  monthNumber
) {

  clearMonthDetail();


  const allRecords =
    recordsByYear.get(
      year
    ) ||
    [];


  const records =
    allRecords.filter(
      record =>
        record.month ===
        monthNumber
    );


  if (
    !records.length
  ) {
    return false;
  }


  const calendarDays =
    yearDetailDaysInMonth(
      year,
      monthNumber
    );


  const localDailyLogCap =
    calculateYearDetailDailyLogCap(
      allRecords
    );


  monthDetailGroup =
    new THREE.Group();


  monthDetailGroup
    .rotation
    .set(
      0.78,
      -0.24,
      0.10
    );


  monthDetailGroup
    .position
    .x =
      0.28;


  masterMotif.add(
    monthDetailGroup
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
          0.20,
          2.03,
          radialT
        );


      const colourDay =
        yearDetailColour(
          year,
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


      monthDetailDayHitTargets
        .push(
          hitTarget
        );


      monthDetailGroup.add(
        dayRoot
      );


      days.push(
        dayData
      );

    }
  );


  monthDetailState = {

    year,

    month:
      monthNumber,

    calendarDays,

    days

  };


  return true;

}


/* =========================================================
   LEVEL 3 MONTH MOTION
   ========================================================= */

function updateMonthDetail(
  time
) {

  if (
    viewMode !==
      "month" ||
    selectedYear ===
      null ||
    !monthDetailGroup ||
    !monthDetailState
  ) {
    return;
  }


  monthDetailState
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


  monthDetailGroup
    .rotation
    .y =
      -0.24 +

      Math.sin(
        time *
          0.16
      ) *
        0.055;


  monthDetailGroup
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

function enterMonthViewImmediate(
  monthNumber
) {

  if (
    selectedYear ===
      null
  ) {
    return;
  }


  const year =
    selectedYear;


  const coverage =
    monthCoverage(
      year,
      monthNumber
    );


  if (
    coverage.state ===
      "none"
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
        year
      ) {

        system.wrapper.visible =
          false;

      }

    }
  );


  if (
    yearDetailGroup
  ) {

    yearDetailGroup.visible =
      false;

  }


  const created =
    createMonthDetail(
      year,
      monthNumber
    );


  if (
    !created
  ) {

    viewMode =
      "year";

    return;
  }


  renderMonthDetailPanel(
    year,
    monthNumber
  );


  interactionHint.textContent =
    `${year} · ${YEAR_DETAIL_MONTH_NAMES[
      monthNumber -
        1
    ]} · HOVER A DAILY RING`;


  updateThunderMonthChart(
    year,
    monthNumber
  );


  showThunderBackButton(
    "month"
  );


  stage.style.cursor =
    "default";

}


function exitMonthViewImmediate() {

  const year =
    selectedYear;


  clearMonthDetail();


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
        year
      ) {

        system.wrapper.visible =
          true;

      }

    }
  );


  if (
    yearDetailGroup
  ) {

    yearDetailGroup.visible =
      true;

  }


  if (
    yearDetailSystem
  ) {

    renderYearDetailPanel(
      yearDetailSystem
    );

  }


  interactionHint.textContent =
    `${year} YEAR DETAIL · HOVER / CLICK A MONTH · DRAG TO ROTATE`;


  updateThunderYearChart(
    year
  );


  showThunderBackButton(
    "year"
  );


  stage.style.cursor =
    "grab";

}



/* =========================================================
   THUNDER_LEVEL_TRANSITIONS_V1

   Short cinematic transition:

   current view
       ↓
   fade to black
       ↓
   change temporal level
       ↓
   fade back in

   Applies to:
   Overview → Year
   Year → Month
   Month → Year
   Year → Overview
   ========================================================= */

let thunderTransitionOverlay =
  null;

let thunderLevelTransitioning =
  false;


function ensureThunderTransitionOverlay() {

  if (
    thunderTransitionOverlay ||
    !stage
  ) {
    return;
  }


  thunderTransitionOverlay =
    document.createElement(
      "div"
    );


  thunderTransitionOverlay.id =
    "thunder-level-transition";


  Object.assign(
    thunderTransitionOverlay.style,

    {
      position:
        "absolute",

      inset:
        "0",

      zIndex:
        "1000",

      background:
        "#020306",

      opacity:
        "0",

      pointerEvents:
        "none",

      transition:
        "opacity 50ms ease"
    }
  );


  stage.appendChild(
    thunderTransitionOverlay
  );

}


function runThunderLevelTransition(
  action
) {

  if (
    thunderLevelTransitioning ||
    typeof action !==
      "function"
  ) {
    return;
  }


  /*
   * Respect reduced-motion preference.
   */
  const reduceMotion =
    window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;


  if (
    reduceMotion
  ) {

    action();

    return;
  }


  ensureThunderTransitionOverlay();


  if (
    !thunderTransitionOverlay
  ) {

    action();

    return;
  }


  thunderLevelTransitioning =
    true;


  hideYearTooltip();


  hideThunderChartTooltip(
    thunderOverviewChart
  );


  hideThunderChartTooltip(
    thunderDetailChart
  );


  /*
   * Immediately block repeat clicks.
   */
  thunderTransitionOverlay
    .style
    .pointerEvents =
      "auto";


  thunderTransitionOverlay
    .style
    .transition =
      "opacity 190ms ease";


  /*
   * FADE TO BLACK
   */
  requestAnimationFrame(
    () => {

      thunderTransitionOverlay
        .style
        .opacity =
          "1";

    }
  );


  window.setTimeout(
    () => {

      /*
       * Switch geometry / UI while screen is black.
       */
      try {

        action();

      } catch (
        error
      ) {

        console.error(
          "Thunder Rhythm level transition error:",
          error
        );

      }


      /*
       * FADE BACK IN
       */
      thunderTransitionOverlay
        .style
        .transition =
          "opacity 250ms ease";


      requestAnimationFrame(
        () => {

          requestAnimationFrame(
            () => {

              thunderTransitionOverlay
                .style
                .opacity =
                  "0";

            }
          );

        }
      );


      window.setTimeout(
        () => {

          thunderTransitionOverlay
            .style
            .pointerEvents =
              "none";


          thunderLevelTransitioning =
            false;

        },
        280
      );

    },
    70
  );

}


/* =========================================================
   TRANSITION-WRAPPED NAVIGATION
   ========================================================= */

function enterYearView(
  system
) {

  if (
    !system
  ) {
    return;
  }


  runThunderLevelTransition(
    () => {

      enterYearViewImmediate(
        system
      );

    }
  );

}


function exitYearView() {

  runThunderLevelTransition(
    () => {

      exitYearViewImmediate();

    }
  );

}


function enterMonthView(
  monthNumber
) {

  if (
    selectedYear ===
      null
  ) {
    return;
  }


  const coverage =
    monthCoverage(
      selectedYear,
      monthNumber
    );


  /*
   * NO DATA months remain unavailable
   * and therefore do not trigger a fade.
   */
  if (
    coverage.state ===
      "none"
  ) {
    return;
  }


  runThunderLevelTransition(
    () => {

      enterMonthViewImmediate(
        monthNumber
      );

    }
  );

}


function exitMonthView() {

  runThunderLevelTransition(
    () => {

      exitMonthViewImmediate();

    }
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

  syncThunderOverviewChartVisibility();



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


      if (
        viewMode ===
          "overview"
      ) {

        system.wrapper.rotation.x =
          0;


        system.wrapper.rotation.z =
          0;


        system.wrapper.rotation.y =
          system.initialY +

          time *
            system.rotationSpeed;

      } else if (
        system.year !==
          selectedYear
      ) {

        system.wrapper.rotation.x =
          0;

        system.wrapper.rotation.y =
          0;

        system.wrapper.rotation.z =
          0;

      }

    }
  );


  masterMotif.rotation.x =
    0;


  masterMotif.rotation.z =
    0;


  if (
    viewMode ===
      "overview"
  ) {

    masterMotif.rotation.y =
      manualMasterY +

      time *
        MASTER_Y_SPEED;

  } else {

    masterMotif.rotation.y =
      0;

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
    Array.from(
      {
        length:
          MONTH_COUNT
      },

      (
        _,
        index
      ) => {

        const monthNumber =
          index +
          1;


        const monthName =
          YEAR_DETAIL_MONTH_NAMES[
            index
          ];


        const coverage =
          monthCoverage(
            system.year,
            monthNumber
          );


        const value =
          system.monthlyTotals[
            index
          ];


        const valueText =
          coverage.state ===
            "none"

            ? "—"

            : formatLightningCount(
                value
              );


        const statusText =
          coverage.state ===
            "none"

            ? "NO DATA"

            : coverage.state ===
                "partial"

              ? "PARTIAL"

              : "";


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
              color:${coverage.state === "none"
                ? "rgba(220,225,240,.28)"
                : "rgba(220,225,240,.58)"};
              letter-spacing:.10em;
            ">
              ${monthName}
              ${statusText
                ? `<span style="
                    margin-left:5px;
                    font-size:7px;
                    color:${coverage.state === "none"
                      ? "rgba(220,225,240,.24)"
                      : "rgba(255,225,140,.55)"};
                  ">${statusText}</span>`
                : ""}
            </span>

            <span style="
              color:${coverage.state === "none"
                ? "rgba(220,225,240,.24)"
                : "rgba(255,245,200,.86)"};
              font-variant-numeric:tabular-nums;
            ">
              ${valueText}
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
        ${system.partial
          ? "RECORDED TOTAL"
          : "ANNUAL TOTAL"}
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
      ${yearCoverageText(
        system.year
      )}
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






function enterYearViewImmediate(
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


  selectedMonth =
    null;


  hoveredMonth =
    null;


  hoveredDay =
    null;


  yearDetailManualYaw =
    0;


  yearDetailManualPitch =
    0;


  hideYearTooltip();


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


      candidate.wrapper.visible =
        active;


      candidate.wrapper.scale.setScalar(

        active

          ? 2.0 /
            Math.max(
              0.001,
              candidate.radius
            )

          : 1

      );

    }
  );


  createYearDetail(
    system
  );


  interactionHint.textContent =
    `${selectedYear} YEAR DETAIL · HOVER / CLICK A MONTH · DRAG TO ROTATE`;


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
    "grab";

}



function exitYearViewImmediate() {

  hideThunderDetailOverlay();


  clearMonthDetail();


  clearYearDetail();


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

            exitMonthView();

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
        `← ${selectedYear} YEAR`;

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
   THUNDER_CHART_HOVER_V1

   Shared hover feedback for all three quantitative charts.

   LEVEL 1 → Year + annual value
   LEVEL 2 → Month + monthly value
   LEVEL 3 → Date + daily value
   ========================================================= */

function hideThunderChartTooltip(
  container
) {

  if (
    !container
  ) {
    return;
  }


  const tooltip =
    container.querySelector(
      ".thunder-chart-tooltip"
    );


  if (
    tooltip
  ) {

    tooltip.style.opacity =
      "0";

    tooltip.style.transform =
      "translateY(4px)";

  }

}


function ensureThunderChartTooltip(
  container
) {

  let tooltip =
    container.querySelector(
      ".thunder-chart-tooltip"
    );


  if (
    tooltip
  ) {
    return tooltip;
  }


  tooltip =
    document.createElement(
      "div"
    );


  tooltip.className =
    "thunder-chart-tooltip";


  Object.assign(
    tooltip.style,

    {
      position:
        "absolute",

      zIndex:
        "30",

      minWidth:
        "118px",

      maxWidth:
        "165px",

      padding:
        "7px 9px",

      boxSizing:
        "border-box",

      border:
        "1px solid rgba(255,235,160,.16)",

      borderRadius:
        "7px",

      background:
        "rgba(2,3,6,.92)",

      backdropFilter:
        "blur(7px)",

      boxShadow:
        "0 4px 22px rgba(0,0,0,.28)",

      color:
        "#f8f8ff",

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


  container.appendChild(
    tooltip
  );


  return tooltip;

}


function showThunderChartTooltip(
  container,
  event,
  item
) {

  if (
    !container ||
    !item
  ) {
    return;
  }


  const tooltip =
    ensureThunderChartTooltip(
      container
    );


  tooltip.innerHTML = `
    <div style="
      font-size:7px;
      letter-spacing:.14em;
      color:rgba(220,225,240,.42);
      margin-bottom:3px;
    ">
      ${item.kicker || "DATA"}
    </div>

    <div style="
      font-size:11px;
      font-weight:600;
      color:rgba(248,248,255,.92);
      margin-bottom:5px;
      white-space:nowrap;
    ">
      ${item.title || ""}
    </div>

    <div style="
      font-size:7px;
      letter-spacing:.10em;
      color:rgba(220,225,240,.40);
      margin-bottom:2px;
    ">
      ${item.valueLabel || "LIGHTNING"}
    </div>

    <div style="
      font-size:13px;
      font-weight:600;
      color:#fff4bd;
      font-variant-numeric:tabular-nums;
    ">
      ${item.valueText || "—"}
    </div>

    ${item.note
      ? `<div style="
          margin-top:5px;
          font-size:6.5px;
          line-height:1.4;
          letter-spacing:.07em;
          color:rgba(255,225,140,.52);
        ">${item.note}</div>`
      : ""}
  `;


  const rect =
    container.getBoundingClientRect();


  const tooltipWidth =
    145;


  let left =
    event.clientX -
    rect.left +
    10;


  let top =
    event.clientY -
    rect.top -
    70;


  if (
    left +
      tooltipWidth >
    rect.width -
      6
  ) {

    left =
      event.clientX -
      rect.left -
      tooltipWidth -
      10;

  }


  if (
    top <
    5
  ) {

    top =
      event.clientY -
      rect.top +
      10;

  }


  tooltip.style.left =
    `${Math.max(
      5,
      left
    )}px`;


  tooltip.style.top =
    `${Math.max(
      5,
      top
    )}px`;


  tooltip.style.opacity =
    "1";


  tooltip.style.transform =
    "translateY(0)";

}


function prepareThunderChartInteraction(
  container,
  hoverItems
) {

  if (
    !container
  ) {
    return;
  }


  /*
   * Store newest chart data on the container.
   * Event listeners only need to be installed once.
   */
  container.__thunderChartHoverItems =
    hoverItems ||
    [];


  container.style.pointerEvents =
    "auto";


  if (
    container.dataset
      .thunderHoverBound ===
      "1"
  ) {
    return;
  }


  container.dataset.thunderHoverBound =
    "1";


  /*
   * Chart interactions must not become
   * canvas drag / zoom interactions.
   */
  [
    "pointerdown",
    "pointerup",
    "click",
    "wheel"
  ].forEach(
    eventName => {

      container.addEventListener(
        eventName,

        event => {

          event.stopPropagation();

        }
      );

    }
  );


  container.addEventListener(
    "pointerenter",

    () => {

      hideYearTooltip();

    }
  );


  container.addEventListener(
    "pointermove",

    event => {

      event.stopPropagation();

      hideYearTooltip();


      const target =
        event.target.closest?.(
          "[data-thunder-chart-index]"
        );


      if (
        !target
      ) {

        hideThunderChartTooltip(
          container
        );

        return;
      }


      const index =
        Number(
          target.getAttribute(
            "data-thunder-chart-index"
          )
        );


      const item =
        container
          .__thunderChartHoverItems?.[
            index
          ];


      if (
        !item
      ) {

        hideThunderChartTooltip(
          container
        );

        return;
      }


      showThunderChartTooltip(
        container,
        event,
        item
      );

    }
  );


  container.addEventListener(
    "pointerleave",

    () => {

      hideThunderChartTooltip(
        container
      );

    }
  );

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
    missing = [],
    year,
    hoverItems = []
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


  const availableValues =
    safeValues.filter(
      (
        _,
        index
      ) =>
        !missing[index]
    );


  const maximum =
    Math.max(
      1,
      ...availableValues
    );


  const hasMissing =
    missing.some(Boolean);


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

          const x =
            left +
            index *
              slot +
            (
              slot -
              barWidth
            ) /
              2;


          const centreX =
            x +
            barWidth /
              2;


          if (
            missing[index]
          ) {

            const baseline =
              top +
              plotHeight -
              1;


            return `
              <text
                x="${centreX.toFixed(2)}"
                y="${baseline.toFixed(2)}"
                text-anchor="middle"
                font-size="${count <= 12 ? 7.0 : 5.3}"
                fill="rgba(220,225,240,.25)"
                font-family="Arial, Helvetica, sans-serif"
              >×</text>
            `;

          }


          const ratio =
            value /
            maximum;


          const barHeight =
            ratio *
            plotHeight;


          const y =
            top +
            plotHeight -
            barHeight;


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
   * Invisible full-slot hit areas make even
   * very short / zero / NO DATA categories easy to hover.
   */
  const hitZones =
    labels
      .map(
        (
          _,
          index
        ) => {

          const x =
            left +
            index *
              slot;


          return `
            <rect
              data-thunder-chart-index="${index}"
              x="${x.toFixed(2)}"
              y="${top}"
              width="${slot.toFixed(2)}"
              height="${plotHeight.toFixed(2)}"
              fill="transparent"
              pointer-events="all"
            />
          `;

        }
      )
      .join("");


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
              fill="${missing[index]
                ? "rgba(220,225,240,.22)"
                : "rgba(220,225,240,.42)"}"
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
        line-height:1.55;
        letter-spacing:.10em;
        color:rgba(220,225,240,.34);
        text-align:right;
        padding-top:2px;
      ">
        MAX<br>
        ${formatLightningCount(
          maximum
        )}
        ${hasMissing
          ? `<br><span style="color:rgba(220,225,240,.25)">× NO DATA</span>`
          : ""}
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

      ${hitZones}

      ${labelSvg}

    </svg>
  `;


  prepareThunderChartInteraction(
    thunderDetailChart,
    hoverItems
  );


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


  const coverages =
    Array.from(
      {
        length:
          MONTH_COUNT
      },

      (
        _,
        index
      ) =>
        monthCoverage(
          year,
          index +
            1
        )
    );


  const values =
    stats.totals.map(
      (
        value,
        index
      ) =>
        coverages[index]
          .state ===
            "none"

          ? null

          : value
    );


  const missing =
    coverages.map(
      coverage =>
        coverage.state ===
        "none"
    );


  const hoverItems =
    YEAR_DETAIL_MONTH_NAMES.map(
      (
        monthName,
        index
      ) => {

        const coverage =
          coverages[index];


        const value =
          values[index];


        let note =
          "";


        if (
          coverage.state ===
            "partial"
        ) {

          note =
            `PARTIAL COVERAGE · ${String(
              coverage.firstDay
            ).padStart(
              2,
              "0"
            )}–${String(
              coverage.lastDay
            ).padStart(
              2,
              "0"
            )} ${monthName}`;

        }


        if (
          coverage.state ===
            "none"
        ) {

          note =
            "NO RECORDED DATA";

        }


        return {
          kicker:
            "MONTH",

          title:
            `${monthName} ${year}`,

          valueLabel:
            "MONTHLY LIGHTNING",

          valueText:
            Number.isFinite(
              value
            )

              ? formatLightningCount(
                  value
                )

              : "NO DATA",

          note
        };

      }
    );


  renderThunderBarChart({

    title:
      `${year} MONTHLY RHYTHM`,

    subtitle:
      "MONTHLY LIGHTNING",

    labels:
      YEAR_DETAIL_MONTH_NAMES,

    values,

    missing,

    year,

    hoverItems

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

  const coverage =
    monthCoverage(
      year,
      month
    );


  const records =
    coverage.records;


  const calendarDays =
    coverage.calendarDays;


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
      ) => {

        const day =
          index +
          1;


        return byDay.has(
          day
        )

          ? byDay.get(
              day
            )

          : null;

      }
    );


  const missing =
    values.map(
      value =>
        !Number.isFinite(
          value
        )
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


  const hoverItems =
    labels.map(
      (
        dayLabel,
        index
      ) => {

        const value =
          values[index];


        return {
          kicker:
            "DAY",

          title:
            `${dayLabel} ${monthName} ${year}`,

          valueLabel:
            "DAILY LIGHTNING",

          valueText:
            Number.isFinite(
              value
            )

              ? formatLightningCount(
                  value
                )

              : "NO DATA",

          note:
            Number.isFinite(
              value
            )

              ? ""

              : "NO RECORDED DATA"
        };

      }
    );


  renderThunderBarChart({

    title:
      `${monthName} ${year} DAILY RHYTHM`,

    subtitle:
      "DAILY LIGHTNING",

    labels,

    values,

    missing,

    year,

    hoverItems

  });

}



/* =========================================================
   THUNDER_OVERVIEW_ANNUAL_CHART_V2

   LEVEL 1 QUANTITATIVE COMPANION
   2005–2026 recorded annual lightning totals

   2005 and 2026 are partial coverage.
   ========================================================= */

let thunderOverviewChart =
  null;


function ensureThunderOverviewChart() {

  if (
    !stage
  ) {
    return;
  }


  if (
    thunderOverviewChart
  ) {
    return;
  }


  thunderOverviewChart =
    document.createElement(
      "div"
    );


  thunderOverviewChart.id =
    "thunder-overview-chart";


  Object.assign(
    thunderOverviewChart.style,

    {
      position:
        "absolute",

      right:
        "28px",

      bottom:
        "28px",

      zIndex:
        "6",

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
    thunderOverviewChart
  );

}


function updateThunderOverviewChart() {

  ensureThunderOverviewChart();


  if (
    !thunderOverviewChart
  ) {
    return;
  }


  const rows =
    YEARS.map(
      (
        year,
        index
      ) => {

        const stats =
          annualStatsByYear.get(
            year
          ) || {
            total:
              0,

            partial:
              false
          };


        return {
          year,
          index,

          total:
            stats.total,

          partial:
            stats.partial
        };

      }
    );


  const maximum =
    Math.max(
      1,

      ...rows.map(
        row =>
          row.total
      )
    );


  const width =
    306;

  const height =
    98;

  const left =
    4;

  const right =
    4;

  const top =
    7;

  const bottom =
    22;


  const plotWidth =
    width -
    left -
    right;


  const plotHeight =
    height -
    top -
    bottom;


  const slot =
    plotWidth /
    rows.length;


  const barWidth =
    Math.max(
      3.0,

      slot *
        0.46
    );


  /*
   * Keep the exact original bar-colour logic:
   *
   * strongest Years → accent colour
   * other Years     → base colour
   *
   * Only opacity fades vertically.
   */
  const gradientDefinitions =
    rows

      .map(
        row => {

          const pair =
            YEAR_COLOUR_PAIRS[
              row.index
            ];


          const baseColour =
            thunderColourToCss(
              pair[0]
            );


          const accentColour =
            thunderColourToCss(
              pair[1]
            );


          const ratio =
            row.total /
            maximum;


          const originalBarColour =
            ratio >
              0.72

              ? accentColour

              : baseColour;


          const topOpacity =
            row.partial

              ? 0.45

              : 1.0;


          return `
            <linearGradient
              id="annual-gradient-${row.year}"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >

              <stop
                offset="0%"
                stop-color="${originalBarColour}"
                stop-opacity="${topOpacity}"
              />

              <stop
                offset="42%"
                stop-color="${originalBarColour}"
                stop-opacity="${(
                  topOpacity *
                  0.58
                ).toFixed(3)}"
              />

              <stop
                offset="100%"
                stop-color="${originalBarColour}"
                stop-opacity="0"
              />

            </linearGradient>
          `;

        }
      )

      .join("");


  const bars =
    rows

      .map(
        row => {

          const ratio =
            row.total /
            maximum;


          const barHeight =
            ratio *
            plotHeight;


          const x =
            left +
            row.index *
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
                1.1,
                barWidth /
                  3
              ).toFixed(2)}"
              fill="url(#annual-gradient-${row.year})"
              opacity="1"
            />
          `;

        }
      )

      .join("");


  /*
   * Wider invisible hit areas.
   * Users do not need to hit the thin visible bar precisely.
   */
  const hitZones =
    rows

      .map(
        row => {

          const x =
            left +
            row.index *
              slot;


          return `
            <rect
              data-thunder-chart-index="${row.index}"
              x="${x.toFixed(2)}"
              y="${top}"
              width="${slot.toFixed(2)}"
              height="${plotHeight.toFixed(2)}"
              fill="transparent"
              pointer-events="all"
            />
          `;

        }
      )

      .join("");


  const yearLabels =
    rows

      .map(
        row => {

          const x =
            left +
            row.index *
              slot +
            slot /
              2;


          const shortYear =
            String(
              row.year
            ).slice(
              -2
            );


          return `
            <text
              x="${x.toFixed(2)}"
              y="${height - 5}"
              text-anchor="middle"
              font-size="5.2"
              fill="${row.partial
                ? "rgba(255,225,140,.60)"
                : "rgba(220,225,240,.36)"}"
              font-family="Arial, Helvetica, sans-serif"
            >
              ${shortYear}${row.partial ? "*" : ""}
            </text>
          `;

        }
      )

      .join("");


  const hoverItems =
    rows.map(
      row => ({

        kicker:
          "YEAR",

        title:
          String(
            row.year
          ),

        valueLabel:
          row.partial

            ? "RECORDED LIGHTNING"

            : "ANNUAL LIGHTNING",

        valueText:
          formatLightningCount(
            row.total
          ),

        note:
          row.partial

            ? yearCoverageText(
                row.year
              )

            : ""

      })
    );


  thunderOverviewChart.innerHTML = `
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
          ANNUAL LIGHTNING
        </div>

        <div style="
          font-size:11px;
          font-weight:600;
          letter-spacing:.02em;
          color:rgba(248,248,255,.88);
        ">
          2005–2026 YEARLY RHYTHM
        </div>

      </div>


      <div style="
        font-size:7px;
        line-height:1.55;
        letter-spacing:.10em;
        color:rgba(220,225,240,.34);
        text-align:right;
        padding-top:2px;
      ">
        MAX RECORDED<br>
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
      aria-label="Annual Hong Kong lightning totals 2005 to 2026"
    >

      <defs>
        ${gradientDefinitions}
      </defs>

      <line
        x1="${left}"
        y1="${top + plotHeight}"
        x2="${width - right}"
        y2="${top + plotHeight}"
        stroke="rgba(220,225,240,.14)"
        stroke-width=".65"
      />

      ${bars}

      ${hitZones}

      ${yearLabels}

    </svg>


    <div style="
      margin-top:1px;
      font-size:7px;
      line-height:1.5;
      letter-spacing:.08em;
      color:rgba(220,225,240,.36);
      text-align:right;
    ">
      * PARTIAL COVERAGE ·
      2005 FROM 21 JUN ·
      2026 THROUGH 31 AUG
    </div>
  `;


  prepareThunderChartInteraction(
    thunderOverviewChart,
    hoverItems
  );


  syncThunderOverviewChartVisibility();

}



function syncThunderOverviewChartVisibility() {

  if (
    !thunderOverviewChart
  ) {
    return;
  }


  thunderOverviewChart
    .style
    .display =

      viewMode ===
        "overview"

        ? "block"

        : "none";

}



function attachInteraction() {

  stage.addEventListener(
    "pointerdown",

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


      if (
        viewMode ===
          "month"
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


        if (
          viewMode ===
            "overview"
        ) {

          manualMasterY +=
            dx *
            0.005;

        }


        if (
          viewMode ===
            "year" &&
          selectedYear !==
            null
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
        selectedYear !==
          null
      ) {

        updateMonthHover(
          event
        );

        return;

      }


      if (
        viewMode ===
          "month" &&
        selectedYear !==
          null
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


      if (
        wasClick &&
        viewMode ===
          "year" &&
        selectedYear !==
          null
      ) {

        const month =
          monthAtPointer(
            event
          );


        if (
          month &&
          month.available
        ) {

          enterMonthView(
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
          "year"
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


  updateYearDetail(
    time
  );


  syncYearDetailRotation(
    time
  );


  updateMonthDetail(
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


  updateThunderOverviewChart();





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