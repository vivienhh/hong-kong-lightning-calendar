/* =========================================================
   THUNDER RHYTHM
   PROTOTYPE 04-R2

   22 YEAR CARRIER RINGS

   PURPOSE
   ---------------------------------------------------------
   Test ONLY the Year-level spatial and kinetic structure.

   No Month.
   No Day.
   No CSV.
   No Hong Kong map.
   No strong glow.
   No Year-level X/Z wobble.
   No random position.

   Inspired by the structural logic of the reference:

   - all Elements share centre (0, 0, 0)
   - different circleRadius
   - different initial angleY
   - different angleYAccel
   - Motif itself also rotates around Y

   Thunder Rhythm adaptation:

   2005 = innermost ring
   ...
   2026 = outermost ring

   All values are deterministic so the result is repeatable.
   ========================================================= */


/* =========================================================
   YEARS
   ========================================================= */

const START_YEAR = 2005;
const END_YEAR = 2026;

const YEARS = Array.from(
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


/* =========================================================
   YEAR GEOMETRY
   ========================================================= */

/*
 * Chronological radius:
 *
 * 2005 = smallest
 * 2026 = largest
 */

const YEAR_RADIUS_MIN =
  0.52;

const YEAR_RADIUS_MAX =
  2.82;


/*
 * Thin 3D carrier ring.
 *
 * No strong glow in this test.
 */

const RING_TUBE_RADIUS =
  0.008;


/*
 * Geometry quality.
 * Only 22 rings, so this is lightweight.
 */

const RING_RADIAL_SEGMENTS =
  6;

const RING_TUBULAR_SEGMENTS =
  160;


/* =========================================================
   MOTION
   ========================================================= */

/*
 * Individual Year rotation speed.
 *
 * All Years rotate in the same direction.
 * Only speed differs slightly.
 */

const YEAR_SPEED_MIN =
  0.035;

const YEAR_SPEED_MAX =
  0.075;


/*
 * Entire motif also rotates,
 * matching the nested Motif → Element
 * logic of the reference.
 */

const MASTER_Y_SPEED =
  0.016;


/*
 * Deterministic low-discrepancy phase.
 *
 * The reference uses:
 *
 * angleY: random(PI)
 *
 * We use a reproducible spread
 * across 0 → PI instead.
 */

const GOLDEN_PHASE =
  0.6180339887498949;


/* =========================================================
   CAMERA
   ========================================================= */

/*
 * Reference uses ortho().
 *
 * We therefore use OrthographicCamera.
 */

const ORTHO_VIEW_HEIGHT =
  6.65;

let cameraZoom =
  1.0;


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let THREE = null;

let renderer = null;
let scene = null;
let camera = null;
let stage = null;

let masterMotif = null;

const yearSystems = [];


/* =========================================================
   INTERACTION
   ========================================================= */

let manualMasterY =
  0;

const pointer = {
  down: false,
  x: 0
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


/* =========================================================
   YEAR STYLE
   ========================================================= */

function yearColour(
  yearIndex
) {
  const t =
    yearIndex /
    Math.max(
      1,
      YEAR_COUNT - 1
    );


  const colour =
    new THREE.Color();


  /*
   * Thunder Rhythm palette:
   *
   * cyan
   * → blue
   * → lavender
   * → violet
   *
   * Colour is NOT lightning magnitude here.
   * It only helps distinguish the Year layers.
   */

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
      YEAR_COUNT - 1
    );


  /*
   * Slightly stronger outer rings,
   * but deliberately restrained.
   */

  return lerp(
    0.32,
    0.62,
    t
  );
}


/* =========================================================
   INITIAL PHASE
   ========================================================= */

function initialYearPhase(
  yearIndex
) {
  /*
   * Equivalent purpose to:
   *
   * random(PI)
   *
   * but deterministic.
   *
   * It distributes rings across:
   *
   * circle
   * ellipse
   * narrow ellipse
   * edge-on line
   */

  const distributed =
    (
      yearIndex *
      GOLDEN_PHASE
    ) %
    1;


  return distributed *
    Math.PI;
}


/* =========================================================
   YEAR SPEED
   ========================================================= */

function yearRotationSpeed(
  yearIndex
) {
  const yearT =
    yearIndex /
    Math.max(
      1,
      YEAR_COUNT - 1
    );


  /*
   * Basic chronological increase.
   */

  const base =
    lerp(
      YEAR_SPEED_MIN,
      YEAR_SPEED_MAX,
      yearT
    );


  /*
   * Tiny deterministic variation.
   *
   * This stops all 22 rings from
   * mechanically synchronising.
   */

  const variation =
    Math.sin(
      yearIndex *
      1.731 +
      0.72
    ) *
    0.006;


  return Math.max(
    0.015,
    base + variation
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
    "year-carrier-ring-test";


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


  /* ---------------------------------------------------------
     TITLE
     --------------------------------------------------------- */

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
      THUNDER RHYTHM · PROTOTYPE 04-R2
    </div>

    <div style="
      font-size:26px;
      font-weight:600;
      letter-spacing:-.03em;
      color:#f7f8ff;
    ">
      22 Year Carrier Rings
    </div>

    <div style="
      margin-top:8px;
      font-size:11px;
      line-height:1.65;
      color:rgba(210,220,240,.55);
    ">
      SHARED CENTRE · Y-AXIS ROTATION ONLY
      <br>
      2005 INNER → 2026 OUTER
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


  /* ---------------------------------------------------------
     INTERACTION HINT
     --------------------------------------------------------- */

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
      window.devicePixelRatio || 1,
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


  /*
   * Orthographic camera:
   *
   * no perspective size distortion.
   *
   * This is one of the important
   * visual characteristics of
   * the OpenProcessing reference.
   */

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


  /*
   * Entire 22-Year Motif.
   */

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
   CREATE ONE YEAR CARRIER RING
   ========================================================= */

function createYearCarrier(
  year,
  yearIndex
) {
  const yearT =
    yearIndex /
    Math.max(
      1,
      YEAR_COUNT - 1
    );


  /*
   * Strict chronology:
   *
   * 2005 → smallest
   * 2026 → largest
   */

  const radius =
    lerp(
      YEAR_RADIUS_MIN,
      YEAR_RADIUS_MAX,
      yearT
    );


  /*
   * Wrapper corresponds to
   * OpenProcessing Element transform.
   */

  const wrapper =
    new THREE.Group();


  /*
   * CRITICAL:
   *
   * Every Year has exactly
   * the same origin.
   */

  wrapper.position.set(
    0,
    0,
    0
  );


  /*
   * Thin Torus carrier.
   *
   * A Torus rather than a flat LineLoop
   * keeps the edge-on state visible.
   */

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

      /*
       * Graphic layering rather than
       * realistic 3D occlusion.
       */

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


  /*
   * Deterministic layering.
   */

  ring.renderOrder =
    yearIndex;


  wrapper.add(
    ring
  );


  /*
   * Equivalent to:
   *
   * angleY: random(PI)
   */

  const initialY =
    initialYearPhase(
      yearIndex
    );


  wrapper.rotation.y =
    initialY;


  /*
   * Equivalent to:
   *
   * angleYAccel:
   * random(-0.01, 0.01)
   *
   * but positive and deterministic
   * for this first test.
   */

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

    initialY,

    rotationSpeed
  });
}


/* =========================================================
   BUILD ALL 22 YEARS
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
    "Year carrier rings built:",
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
}


/* =========================================================
   MOTION
   ========================================================= */

function updateYearMotion(time) {
  yearSystems.forEach(
    system => {
      /*
       * ONLY Y rotation.
       *
       * No X rotation.
       * No Z rotation.
       * No wobble.
       * No translation.
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
  );


  /*
   * Equivalent to Motif's own:
   *
   * angleYAccel
   *
   * The complete sculpture
   * also turns slowly around Y.
   */

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


      /*
       * Horizontal drag only.
       *
       * Still Y-axis rotation only.
       */

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

function animate(timestamp) {
  requestAnimationFrame(
    animate
  );


  const time =
    timestamp *
    0.001;


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
  THREE =
    await import(
      "https://cdn.jsdelivr.net/npm/three@0.180.0/+esm"
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
    "Thunder Rhythm 22-Year Carrier Rings ready."
  );
}


initialisePrototype()
  .catch(error => {
    console.error(
      "22-Year Carrier Rings prototype error:",
      error
    );
  });