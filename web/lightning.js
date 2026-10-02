const LIGHTNING_DATA_PATH =
  "./data/daily_HK_LGTG_ALL.csv";

const BOUNDARY_PATH =
  "./data/hong-kong-boundary-precise.geojson";

const DEFAULT_YEAR = 2025;

const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR",
  "MAY", "JUN", "JUL", "AUG",
  "SEP", "OCT", "NOV", "DEC"
];

const YEAR_COLOURS = [
  "#A7DFFF",
  "#63EFE4",
  "#C7CBFF",
  "#AEB6FF",
  "#E7B7C8",
  "#E4C98C",
  "#63EFE4",
  "#A7DFFF"
];

let lightningRecords = [];
let boundaryGeoJSON = null;

let selectedYear =
  DEFAULT_YEAR;

let redrawQueued =
  false;


/* =========================================================
   LOAD FILES
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


async function loadJSON(path) {

  const response =
    await fetch(path);

  if (!response.ok) {

    throw new Error(
      `Could not load ${path}: ${response.status}`
    );

  }

  return response.json();

}


/* =========================================================
   LIGHTNING DATA
   ========================================================= */

async function loadLightningData() {

  const text =
    await loadText(
      LIGHTNING_DATA_PATH
    );


  const lines =
    text
      .trim()
      .split(/\r?\n/)
      .map(
        line =>
          line.trim()
      )
      .filter(Boolean);


  /*
   * HKO CSV:
   *
   * line 1 = Chinese title
   * line 2 = English title
   * line 3 = headings
   * line 4 onwards = data
   */

  lightningRecords =
    lines
      .slice(3)
      .map(
        line => {

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
              completeness?.trim()
              || ""

          };

        }
      )
      .filter(
        record =>

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


  console.log(
    "Lightning records loaded:",
    lightningRecords.length
  );

}


/* =========================================================
   CALENDAR
   ========================================================= */

function isLeapYear(year) {

  return (
    year % 4 === 0 &&
    year % 100 !== 0
  )
  ||
  year % 400 === 0;

}


function daysInYear(year) {

  return isLeapYear(year)
    ? 366
    : 365;

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


  return Math.floor(
    (
      current -
      start
    )
    /
    86400000
  );

}


function recordsForYear(year) {

  return lightningRecords
    .filter(
      record =>
        record.year === year
    )
    .sort(
      (a, b) =>
        (
          a.month -
          b.month
        )
        ||
        (
          a.day -
          b.day
        )
    );

}


function buildCalendarYear(year) {

  const calendar =
    Array.from(
      {
        length:
          daysInYear(year)
      },

      (_, index) => ({
        index,
        record: null
      })
    );


  recordsForYear(year)
    .forEach(
      record => {

        const index =
          dayOfYear(
            record.year,
            record.month,
            record.day
          );


        if (
          index >= 0 &&
          index <
            calendar.length
        ) {

          calendar[index]
            .record =
              record;

        }

      }
    );


  return calendar;

}


/* =========================================================
   SUMMARY
   ========================================================= */

function showYearSummary(year) {

  const records =
    recordsForYear(year);


  if (!records.length) {

    return;

  }


  const annualTotal =
    records.reduce(
      (
        sum,
        record
      ) =>
        sum +
        record.value,

      0
    );


  const activeDays =
    records.filter(
      record =>
        record.value > 0
    ).length;


  const peakDay =
    records.reduce(

      (
        highest,
        record
      ) =>

        record.value >
        highest.value

          ? record
          : highest,

      records[0]

    );


  console.log(
    `----- ${year} -----`
  );


  console.log(
    "Annual total:",
    annualTotal
  );


  console.log(
    "Active days:",
    activeDays
  );


  console.log(
    "Peak day:",
    `${peakDay.year}-${peakDay.month}-${peakDay.day}`
  );


  console.log(
    "Peak count:",
    peakDay.value
  );


  console.log(
    "Number of records:",
    records.length
  );

}


/* =========================================================
   BOUNDARY → SCREEN BOUNDS
   ========================================================= */

function collectCoordinates(
  value,
  result = []
) {

  if (!value) {

    return result;

  }


  if (
    value.type ===
    "FeatureCollection"
  ) {

    value.features
      .forEach(
        feature =>
          collectCoordinates(
            feature,
            result
          )
      );


    return result;

  }


  if (
    value.type ===
    "Feature"
  ) {

    return collectCoordinates(
      value.geometry,
      result
    );

  }


  if (
    value.type ===
    "Polygon"
  ) {

    value.coordinates
      .forEach(
        ring =>
          ring.forEach(
            coordinate =>
              result.push(
                coordinate
              )
          )
      );

  }


  else if (
    value.type ===
    "MultiPolygon"
  ) {

    value.coordinates
      .forEach(
        polygon =>
          polygon.forEach(
            ring =>
              ring.forEach(
                coordinate =>
                  result.push(
                    coordinate
                  )
              )
          )
      );

  }


  return result;

}


function getProjectedHongKongBounds() {

  const coordinates =
    collectCoordinates(
      boundaryGeoJSON
    );


  const projected =
    coordinates.map(
      (
        [
          lng,
          lat
        ]
      ) =>
        map.project({
          lng,
          lat
        })
    );


  const xs =
    projected.map(
      point =>
        point.x
    );


  const ys =
    projected.map(
      point =>
        point.y
    );


  return {

    minX:
      Math.min(...xs),

    maxX:
      Math.max(...xs),

    minY:
      Math.min(...ys),

    maxY:
      Math.max(...ys)

  };

}


/* =========================================================
   COLOUR
   ========================================================= */

function hexToRgb(hex) {

  const clean =
    hex.replace(
      "#",
      ""
    );


  return {

    r:
      parseInt(
        clean.slice(
          0,
          2
        ),
        16
      ),

    g:
      parseInt(
        clean.slice(
          2,
          4
        ),
        16
      ),

    b:
      parseInt(
        clean.slice(
          4,
          6
        ),
        16
      )

  };

}


function interpolateColour(
  colourA,
  colourB,
  amount
) {

  const a =
    hexToRgb(
      colourA
    );


  const b =
    hexToRgb(
      colourB
    );


  const r =
    Math.round(
      a.r +
      (
        b.r -
        a.r
      )
      *
      amount
    );


  const g =
    Math.round(
      a.g +
      (
        b.g -
        a.g
      )
      *
      amount
    );


  const blue =
    Math.round(
      a.b +
      (
        b.b -
        a.b
      )
      *
      amount
    );


  return (
    `rgb(${r}, ${g}, ${blue})`
  );

}


function colourForPosition(
  position
) {

  const scaled =
    position *
    (
      YEAR_COLOURS.length -
      1
    );


  const index =
    Math.min(

      Math.floor(
        scaled
      ),

      YEAR_COLOURS.length -
      2

    );


  return interpolateColour(

    YEAR_COLOURS[index],

    YEAR_COLOURS[
      index + 1
    ],

    scaled -
      index

  );

}


/* =========================================================
   SVG
   ========================================================= */

function ensureSvg() {

  let svg =
    document
      .getElementById(
        "lightning-halo"
      );


  if (svg) {

    return svg;

  }


  svg =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );


  svg.id =
    "lightning-halo";


  Object.assign(
    svg.style,
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
        "6",

      pointerEvents:
        "none",

      overflow:
        "visible"

    }
  );


  document.body
    .appendChild(
      svg
    );


  return svg;

}


function makeLine({
  x1,
  y1,
  x2,
  y2,
  colour,
  width,
  opacity,
  dash = null
}) {

  const line =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );


  line.setAttribute(
    "x1",
    x1
  );


  line.setAttribute(
    "y1",
    y1
  );


  line.setAttribute(
    "x2",
    x2
  );


  line.setAttribute(
    "y2",
    y2
  );


  line.setAttribute(
    "stroke",
    colour
  );


  line.setAttribute(
    "stroke-width",
    width
  );


  line.setAttribute(
    "stroke-opacity",
    opacity
  );


  line.setAttribute(
    "stroke-linecap",
    "round"
  );


  if (dash) {

    line.setAttribute(
      "stroke-dasharray",
      dash
    );

  }


  return line;

}


/* =========================================================
   ELLIPSE
   ========================================================= */

function ellipsePoint(
  cx,
  cy,
  rx,
  ry,
  angle
) {

  return {

    x:
      cx +
      Math.cos(
        angle
      ) *
      rx,

    y:
      cy +
      Math.sin(
        angle
      ) *
      ry

  };

}


function ellipseArcPath(
  cx,
  cy,
  rx,
  ry,
  startAngle,
  endAngle
) {

  const start =
    ellipsePoint(
      cx,
      cy,
      rx,
      ry,
      startAngle
    );


  const end =
    ellipsePoint(
      cx,
      cy,
      rx,
      ry,
      endAngle
    );


  return (
    `M ${start.x} ${start.y} ` +
    `A ${rx} ${ry} 0 0 1 ` +
    `${end.x} ${end.y}`
  );

}


/* =========================================================
   MONTH STRUCTURE
   ========================================================= */

function monthStartIndices(
  year
) {

  const starts = [];


  for (
    let month = 0;
    month < 12;
    month += 1
  ) {

    starts.push(
      dayOfYear(
        year,
        month + 1,
        1
      )
    );

  }


  starts.push(
    daysInYear(
      year
    )
  );


  return starts;

}


/* =========================================================
   INTENSITY SCALE
   ========================================================= */

function getIntensityCap(
  calendar
) {

  const values =
    calendar

      .filter(
        item =>
          item.record &&
          item.record.value > 0
      )

      .map(
        item =>
          Math.log1p(
            item.record.value
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
   * 98th percentile prevents
   * one extreme storm from
   * flattening the rest.
   */

  const index =
    Math.floor(
      (
        values.length -
        1
      )
      *
      0.98
    );


  return Math.max(
    values[index],
    1
  );

}


/* =========================================================
   MONTH RING
   ========================================================= */

function drawMonthRing({
  svg,
  cx,
  cy,
  rx,
  ry,
  calendar
}) {

  const starts =
    monthStartIndices(
      selectedYear
    );


  const totalDays =
    calendar.length;


  for (
    let month = 0;
    month < 12;
    month += 1
  ) {

    const startPosition =
      starts[month] /
      totalDays;


    const endPosition =
      starts[
        month + 1
      ] /
      totalDays;


    const startAngle =
      -Math.PI / 2 +
      startPosition *
      Math.PI *
      2;


    const endAngle =
      -Math.PI / 2 +
      endPosition *
      Math.PI *
      2;


    const middlePosition =
      (
        startPosition +
        endPosition
      )
      /
      2;


    const middleAngle =
      -Math.PI / 2 +
      middlePosition *
      Math.PI *
      2;


    const colour =
      colourForPosition(
        middlePosition
      );


    /*
     * Month arc
     */

    const arc =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );


    arc.setAttribute(
      "d",
      ellipseArcPath(
        cx,
        cy,
        rx,
        ry,
        startAngle + 0.012,
        endAngle - 0.012
      )
    );


    arc.setAttribute(
      "fill",
      "none"
    );


    arc.setAttribute(
      "stroke",
      colour
    );


    arc.setAttribute(
      "stroke-width",
      "1.25"
    );


    arc.setAttribute(
      "stroke-opacity",
      "0.48"
    );


    svg.appendChild(
      arc
    );


    /*
     * Month label
     */

    const labelPoint =
      ellipsePoint(
        cx,
        cy,
        rx + 27,
        ry + 22,
        middleAngle
      );


    const text =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );


    text.setAttribute(
      "x",
      labelPoint.x
    );


    text.setAttribute(
      "y",
      labelPoint.y
    );


    text.setAttribute(
      "fill",
      colour
    );


    text.setAttribute(
      "fill-opacity",
      "0.80"
    );


    text.setAttribute(
      "font-size",
      "9"
    );


    text.setAttribute(
      "font-family",
      "Arial, Helvetica, sans-serif"
    );


    text.setAttribute(
      "font-weight",
      "500"
    );


    text.setAttribute(
      "letter-spacing",
      "1.35"
    );


    text.setAttribute(
      "text-anchor",
      "middle"
    );


    text.textContent =
      MONTH_NAMES[
        month
      ];


    svg.appendChild(
      text
    );

  }

}


/* =========================================================
   DRAW CALENDAR HALO
   ========================================================= */

function drawLightningHalo() {

  if (
    !boundaryGeoJSON ||
    lightningRecords.length === 0
  ) {

    return;

  }


  const svg =
    ensureSvg();


  svg.replaceChildren();


  const container =
    map.getContainer();


  const width =
    container.clientWidth;


  const height =
    container.clientHeight;


  svg.setAttribute(
    "viewBox",
    `0 0 ${width} ${height}`
  );


  /*
   * Hong Kong remains geographic context.
   *
   * The halo is NOT geographic.
   * It is a separate temporal coordinate
   * system surrounding the map.
   */

  const bounds =
    getProjectedHongKongBounds();


  const hkWidth =
    bounds.maxX -
    bounds.minX;


  const hkHeight =
    bounds.maxY -
    bounds.minY;


  const cx =
    (
      bounds.minX +
      bounds.maxX
    )
    /
    2;


  const cy =
    (
      bounds.minY +
      bounds.maxY
    )
    /
    2;


  /*
   * Organic horizontal ellipse.
   *
   * It loosely echoes Hong Kong's
   * landscape orientation without
   * copying the fragmented coastline.
   */

  const rx =
    hkWidth / 2 +
    76;


  const ry =
    hkHeight / 2 +
    56;


  const calendar =
    buildCalendarYear(
      selectedYear
    );


  const intensityCap =
    getIntensityCap(
      calendar
    );


  /*
   * Inner month structure
   */

  drawMonthRing({
    svg,
    cx,
    cy,
    rx,
    ry,
    calendar
  });


  /*
   * Three visual layers:
   *
   * baseline = every day
   * glow = active days
   * core = precise data filament
   */

  const baselineGroup =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );


  const glowGroup =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );


  const coreGroup =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );


  glowGroup.style.filter =
    "blur(2px)";


  glowGroup.style.mixBlendMode =
    "screen";


  coreGroup.style.mixBlendMode =
    "screen";


  calendar.forEach(
    (
      item,
      index
    ) => {

      const position =
        index /
        calendar.length;


      /*
       * Jan 1 begins at 12 o'clock.
       * Time moves clockwise.
       */

      const angle =
        -Math.PI / 2 +
        position *
        Math.PI *
        2;


      const anchor =
        ellipsePoint(
          cx,
          cy,
          rx,
          ry,
          angle
        );


      const value =
        item.record
          ? item.record.value
          : 0;


      const rawIntensity =
        value > 0

          ? Math.log1p(
              value
            )
            /
            intensityCap

          : 0;


      const intensity =
        Math.max(
          0,
          Math.min(
            1,
            rawIntensity
          )
        );


      const shaped =
        Math.pow(
          intensity,
          0.76
        );


      const colour =
        colourForPosition(
          position
        );


      /*
       * Every data filament points
       * vertically upward.
       *
       * Position = date
       * Height = lightning count
       * Colour = time progression
       */

      const baselineHeight =
        3.5;


      const dataHeight =
        value > 0

          ? 10 +
            shaped *
            102

          : baselineHeight;


      /*
       * Faint annual baseline
       */

      baselineGroup.appendChild(

        makeLine({

          x1:
            anchor.x,

          y1:
            anchor.y,

          x2:
            anchor.x,

          y2:
            anchor.y -
            baselineHeight,

          colour,

          width:
            0.45,

          opacity:
            0.17

        })

      );


      /*
       * Soft atmospheric glow
       */

      if (
        value > 0
      ) {

        glowGroup.appendChild(

          makeLine({

            x1:
              anchor.x,

            y1:
              anchor.y,

            x2:
              anchor.x,

            y2:
              anchor.y -
              dataHeight,

            colour,

            width:
              2.0 +
              shaped *
              1.3,

            opacity:
              0.07 +
              shaped *
              0.29

          })

        );

      }


      /*
       * Fine dotted filament
       */

      coreGroup.appendChild(

        makeLine({

          x1:
            anchor.x,

          y1:
            anchor.y,

          x2:
            anchor.x,

          y2:
            anchor.y -
            dataHeight,

          colour,

          width:
            value > 0
              ? 0.78
              : 0.40,

          opacity:
            value > 0
              ? 0.38 +
                shaped *
                0.58
              : 0.13,

          dash:
            value > 0
              ? "1 2.15"
              : null

        })

      );

    }
  );


  svg.appendChild(
    baselineGroup
  );


  svg.appendChild(
    glowGroup
  );


  svg.appendChild(
    coreGroup
  );

}


/* =========================================================
   REDRAW
   ========================================================= */

function scheduleRedraw() {

  if (
    redrawQueued
  ) {

    return;

  }


  redrawQueued =
    true;


  requestAnimationFrame(
    () => {

      redrawQueued =
        false;


      drawLightningHalo();

    }
  );

}


/* =========================================================
   START
   ========================================================= */

async function initialiseLightning() {

  const [
    _,
    boundary
  ] =
    await Promise.all([

      loadLightningData(),

      loadJSON(
        BOUNDARY_PATH
      )

    ]);


  boundaryGeoJSON =
    boundary;


  showYearSummary(
    DEFAULT_YEAR
  );


  const start =
    () => {

      drawLightningHalo();


      /*
       * Keep the temporal halo
       * centred around Hong Kong
       * while the map moves.
       */

      map.on(
        "move",
        scheduleRedraw
      );


      map.on(
        "resize",
        scheduleRedraw
      );


      console.log(
        "Thunder Rhythm calendar halo ready."
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


initialiseLightning()
  .catch(
    error => {

      console.error(
        "Lightning visualisation error:",
        error
      );

    }
  );