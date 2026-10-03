/* =========================================================
   THUNDER RHYTHM
   PROTOTYPE 03

   2025 CONCENTRIC MONTH RIPPLE TEST

   Structure:

   2025 YEAR
        ↓
   luminous Year orbit
        ↓
   12 Month modules
        ↓
   each Month =
   28–31 concentric Daily rings

   Day 01 = innermost ring
   Last day = outermost ring

   Lightning count controls:
   - ring brightness
   - ring thickness
   - glow

   Motion inspired by:
   OpenProcessing "Floating"

   Each Daily ring receives a different
   Z-axis phase, producing a continuous
   ripple / bowl / breathing-disc effect.

   No Hong Kong map.
   No other years yet.
   ========================================================= */


const LIGHTNING_DATA_PATH =
  "./data/daily_HK_LGTG_ALL.csv";

const TARGET_YEAR = 2025;

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
   GEOMETRY
   ========================================================= */

/*
 * The large 2025 Year orbit.
 */
const YEAR_RADIUS = 2.0;


/*
 * Each Month becomes one concentric
 * ripple disc.
 */
const MONTH_INNER_RADIUS = 0.040;
const MONTH_OUTER_RADIUS = 0.34;

const MONTH_COUNT = 12;


/*
 * Maximum depth of the Month ripple.
 *
 * Outer rings move slightly more
 * than inner rings, creating a more
 * readable three-dimensional wave.
 */
const RIPPLE_INNER_AMPLITUDE = 0.045;
const RIPPLE_OUTER_AMPLITUDE = 0.105;


/* =========================================================
   THREE / GLOBAL STATE
   ========================================================= */

let THREE = null;

let renderer = null;
let scene = null;
let camera = null;

let stage = null;

let systemGroup = null;
let yearGroup = null;

let yearFlowMaterial = null;

const monthSystems = [];

let lightningRecords = [];
let records2025 = [];

let dailyLogCap = 1;

let monthOrbitOffset = 0;

let manualYaw = 0;
let manualPitch = 0;

let cameraDistance = 7.4;

let animationFrameId = null;


const pointer = {
  down: false,
  x: 0,
  y: 0
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

      /*
       * HKO file begins with
       * three heading lines.
       */
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


  records2025 =
    lightningRecords
      .filter(
        record =>
          record.year ===
          TARGET_YEAR
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
      );


  dailyLogCap =
    calculateDailyLogCap(
      records2025
    );


  console.log(
    "2025 lightning records loaded:",
    records2025.length
  );
}


function calculateDailyLogCap(records) {
  const values =
    records
      .filter(
        record =>
          record.value > 0
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


  if (!values.length) {
    return 1;
  }


  /*
   * Prevent one extreme day from making
   * all other days visually invisible.
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


function normaliseLightning(value) {
  if (
    value <= 0
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
   COLOUR
   ========================================================= */

function monthColour(index) {
  const colour =
    new THREE.Color();


  const t =
    index /
    Math.max(
      1,
      MONTH_COUNT - 1
    );


  /*
   * Cyan
   * → blue
   * → violet
   * → magenta
   */

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


  /*
   * Strong lightning becomes
   * closer to white-hot light.
   */
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
   DATA → RING STYLE
   ========================================================= */

function intensityLevel(intensity) {
  if (
    intensity === 0
  ) {
    return 0;
  }

  if (
    intensity < 0.20
  ) {
    return 1;
  }

  if (
    intensity < 0.45
  ) {
    return 2;
  }

  if (
    intensity < 0.72
  ) {
    return 3;
  }

  return 4;
}


/*
 * Lightning count → line thickness.
 *
 * The rings are concentric and quite close
 * together, so these values stay restrained.
 */
function dayTubeRadius(level) {
  return [
    0.00125,
    0.00175,
    0.00245,
    0.00355,
    0.00520
  ][level];
}


function dayOpacity(level) {
  return [
    0.075,
    0.16,
    0.32,
    0.61,
    0.94
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
    "year-2025-ripple-prototype";


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
      THUNDER RHYTHM · PROTOTYPE 03
    </div>

    <div style="
      font-size:26px;
      font-weight:600;
      letter-spacing:-.03em;
      color:#f7f8ff;
    ">
      2025 Concentric Month Ripples
    </div>

    <div style="
      margin-top:8px;
      font-size:11px;
      line-height:1.6;
      color:rgba(210,220,240,.55);
    ">
      1 YEAR · 12 MONTH RIPPLE DISCS · 365 DAILY RINGS
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
    "DRAG TO ROTATE · SCROLL TO ZOOM";


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
    new THREE.PerspectiveCamera(
      42,
      1,
      0.1,
      100
    );


  systemGroup =
    new THREE.Group();


  yearGroup =
    new THREE.Group();


  systemGroup.add(
    yearGroup
  );


  scene.add(
    systemGroup
  );


  resize();
}


/* =========================================================
   YEAR ORBIT
   ========================================================= */

function createYearOrbit() {
  /*
   * No visible Year path line.
   *
   * Only moving luminous particles
   * reveal the large annual orbit.
   */

  const PARTICLE_COUNT =
    84;


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
      0.055;


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


  yearFlowMaterial =
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          value:
            0
        },

        uRadius: {
          value:
            YEAR_RADIUS
        }
      },


      vertexShader: `
        uniform float uTime;
        uniform float uRadius;

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
            0.18 +

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


          gl_PointSize =
            (
              2.0 +
              vBrightness *
                4.2
            ) *
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


          colour =
            mix(
              colour,
              vec3(1.0),

              core *
              vBrightness *
                0.50
            );


          alpha *=
            0.15 +
            vBrightness *
              0.68;


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
        THREE.AdditiveBlending
    });


  const flowPoints =
    new THREE.Points(
      flowGeometry,
      yearFlowMaterial
    );


  flowPoints.frustumCulled =
    false;


  yearGroup.add(
    flowPoints
  );
}


/* =========================================================
   MONTH RIPPLE SYSTEMS
   ========================================================= */

function createMonthSystems() {
  for (
    let monthIndex = 0;
    monthIndex < MONTH_COUNT;
    monthIndex += 1
  ) {
    const monthNumber =
      monthIndex + 1;


    const calendarDays =
      daysInMonth(
        TARGET_YEAR,
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
     * Slightly different initial orientation
     * for each Month creates a less mechanical
     * composition while keeping the hierarchy.
     */
    monthRoot.rotation.z =
      monthIndex *
      0.09;


    const days = [];


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


        /*
         * Day 01 = smallest radius.
         * Last day = largest radius.
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


        /*
         * Each Day is now one
         * CONCENTRIC ring.
         */

        const geometry =
          new THREE.TorusGeometry(
            ringRadius,

            dayTubeRadius(
              level
            ),

            6,
            56
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
              level >= 3
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


        /*
         * Stronger lightning receives
         * a restrained additional glow.
         */

        let haloRing = null;


        if (
          level >= 3
        ) {
          const haloGeometry =
            new THREE.TorusGeometry(
              ringRadius,

              dayTubeRadius(
                level
              ) *
                2.15,

              6,
              56
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
                  level === 4
                    ? 0.11
                    : 0.050,

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

          /*
           * Similar to the Processing
           * reference:
           *
           * i * phase offset
           */
          phase:
            record.day *
              0.43 +
            monthIndex *
              0.71
        });
      }
    );


    /*
     * Month centres remain evenly spaced
     * around the Year orbit.
     */

    yearGroup.add(
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
    "2025 concentric hierarchy:",
    "12 month ripple discs ·",

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
}


/* =========================================================
   MONTH POSITION + RIPPLE MOTION
   ========================================================= */

function updateMonths(time) {
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


  monthSystems.forEach(
    month => {
      /*
       * The 12 Month centres continue
       * to circulate around the Year orbit.
       *
       * Their order always remains
       * JAN → DEC.
       */

      const monthAngle =
        month.baseAngle +
        monthOrbitOffset;


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


      /*
       * Orient Month disc perpendicular
       * to the tangent of Year orbit.
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
       * Processing-inspired floating
       * orientation.
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


      /*
       * =====================================================
       * DAILY RIPPLE
       *
       * Inspired by:
       *
       * z = sin(
       *   frameCount * speed +
       *   i * phase
       * ) * amplitude
       *
       * Every Day ring stays concentric.
       * Only its local Z position changes.
       * =====================================================
       */

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


          /*
           * Concentric ring moves
           * forward / backward in Z.
           */

          day.root.position.z =
            wave *
            amplitude;


          /*
           * Tiny secondary breathing
           * keeps the form organic,
           * but date radius remains
           * effectively unchanged.
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
           * Strong days shimmer a little
           * more, without changing the
           * underlying lightning value.
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
                0.020;


            day.haloRing
              .scale
              .setScalar(
                haloPulse
              );
          }
        }
      );
    }
  );
}


/* =========================================================
   CAMERA + INTERACTION
   ========================================================= */

function updateCamera() {
  camera.position.set(
    0,
    0,
    cameraDistance
  );


  camera.lookAt(
    0,
    0,
    0
  );
}


function attachInteraction() {
  stage.addEventListener(
    "pointerdown",

    event => {
      pointer.down =
        true;


      pointer.x =
        event.clientX;


      pointer.y =
        event.clientY;


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


      const dy =
        event.clientY -
        pointer.y;


      manualYaw +=
        dx *
        0.005;


      manualPitch +=
        dy *
        0.004;


      manualPitch =
        clamp(
          manualPitch,
          -1.0,
          1.0
        );


      pointer.x =
        event.clientX;


      pointer.y =
        event.clientY;
    }
  );


  stage.addEventListener(
    "pointerup",

    () => {
      pointer.down =
        false;


      stage.style.cursor =
        "grab";
    }
  );


  stage.addEventListener(
    "pointercancel",

    () => {
      pointer.down =
        false;


      stage.style.cursor =
        "grab";
    }
  );


  stage.addEventListener(
    "wheel",

    event => {
      event.preventDefault();


      cameraDistance +=
        event.deltaY *
        0.003;


      cameraDistance =
        clamp(
          cameraDistance,
          4.8,
          11
        );


      updateCamera();
    },

    {
      passive:
        false
    }
  );
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


  const width =
    window.innerWidth;


  const height =
    window.innerHeight;


  renderer.setSize(
    width,
    height,
    false
  );


  camera.aspect =
    width /
    height;


  camera.updateProjectionMatrix();


  updateCamera();
}


/* =========================================================
   ANIMATION
   ========================================================= */

function animate(timestamp) {
  animationFrameId =
    requestAnimationFrame(
      animate
    );


  const time =
    timestamp *
    0.001;


  /*
   * Luminous flow around the
   * invisible Year orbit.
   */

  yearFlowMaterial
    .uniforms
    .uTime
    .value =
      time;


  /*
   * 12 Month ripple modules
   * circulate slowly around Year.
   */

  monthOrbitOffset =
    time *
    0.075;


  updateMonths(
    time
  );


  /*
   * Entire 2025 hierarchy also
   * slowly rotates in 3D.
   */

  systemGroup.rotation.x =
    0.70 +
    manualPitch +
    Math.sin(
      time *
        0.12
    ) *
      0.10;


  systemGroup.rotation.y =
    -0.30 +
    manualYaw +
    time *
      0.087;


  systemGroup.rotation.z =
    0.12 +
    Math.cos(
      time *
        0.09
    ) *
      0.075;


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

  createYearOrbit();

  createMonthSystems();

  attachInteraction();


  window.addEventListener(
    "resize",
    resize
  );


  animationFrameId =
    requestAnimationFrame(
      animate
    );


  console.log(
    "Thunder Rhythm 2025 Concentric Month Ripple Test ready."
  );
}


initialisePrototype()
  .catch(error => {
    console.error(
      "2025 Concentric Month Ripple prototype error:",
      error
    );
  });