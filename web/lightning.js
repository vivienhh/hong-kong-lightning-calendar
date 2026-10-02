const LIGHTNING_DATA_PATH =
  "./data/daily_HK_LGTG_ALL.csv";

const COASTLINE_PATH =
  "./data/hong-kong-coastline.geojson";

const BOUNDARY_PATH =
  "./data/hong-kong-boundary-precise.geojson";

const DEFAULT_YEAR = 2025;
const HK_LAYER_ID = "hong-kong-lavender";

const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
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
let coastlineGeoJSON = null;
let boundaryGeoJSON = null;

let selectedYear = DEFAULT_YEAR;
let viewMode = "overview";
let stackProgress = 0;

let redrawQueued = false;
let stackAnimationFrame = null;
let interactionAttached = false;


/* =========================================================
   LOAD
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


async function loadJSON(path) {
  const response = await fetch(path);

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
      .map(line => line.trim())
      .filter(Boolean);

  lightningRecords =
    lines
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


/* =========================================================
   CALENDAR
   ========================================================= */

function isLeapYear(year) {
  return (
    year % 4 === 0 &&
    year % 100 !== 0
  ) || year % 400 === 0;
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
    (current - start) /
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
        (a.month - b.month) ||
        (a.day - b.day)
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
        record: null,

        monthIndex:
          new Date(
            Date.UTC(
              year,
              0,
              index + 1
            )
          ).getUTCMonth()
      })
    );

  recordsForYear(year)
    .forEach(record => {
      const index =
        dayOfYear(
          record.year,
          record.month,
          record.day
        );

      if (
        index >= 0 &&
        index < calendar.length
      ) {
        calendar[index].record =
          record;

        calendar[index].monthIndex =
          record.month - 1;
      }
    });

  return calendar;
}


function monthStartIndices(year) {
  return MONTH_NAMES.map(
    (_, monthIndex) =>
      dayOfYear(
        year,
        monthIndex + 1,
        1
      )
  );
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
      (sum, record) =>
        sum + record.value,
      0
    );

  const activeDays =
    records.filter(
      record =>
        record.value > 0
    ).length;

  const peakDay =
    records.reduce(
      (highest, record) =>
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
   GEOJSON
   ========================================================= */

function extractLinePaths(
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
      .forEach(feature =>
        extractLinePaths(
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
    return extractLinePaths(
      value.geometry,
      result
    );
  }

  if (
    value.type ===
    "GeometryCollection"
  ) {
    value.geometries
      .forEach(geometry =>
        extractLinePaths(
          geometry,
          result
        )
      );

    return result;
  }

  if (
    value.type ===
    "LineString"
  ) {
    result.push(
      value.coordinates
    );
  }

  else if (
    value.type ===
    "MultiLineString"
  ) {
    value.coordinates
      .forEach(line =>
        result.push(line)
      );
  }

  else if (
    value.type ===
    "Polygon"
  ) {
    value.coordinates
      .forEach(ring =>
        result.push(ring)
      );
  }

  else if (
    value.type ===
    "MultiPolygon"
  ) {
    value.coordinates
      .forEach(polygon =>
        polygon.forEach(ring =>
          result.push(ring)
        )
      );
  }

  return result;
}


function extractOuterRings(
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
      .forEach(feature =>
        extractOuterRings(
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
    return extractOuterRings(
      value.geometry,
      result
    );
  }

  if (
    value.type ===
    "Polygon"
  ) {
    if (
      value.coordinates[0]
    ) {
      result.push(
        value.coordinates[0]
      );
    }
  }

  else if (
    value.type ===
    "MultiPolygon"
  ) {
    value.coordinates
      .forEach(polygon => {
        if (
          polygon[0]
        ) {
          result.push(
            polygon[0]
          );
        }
      });
  }

  return result;
}


/* =========================================================
   PROJECT GEOMETRY
   ========================================================= */

function projectCoordinatePath(
  coordinates,
  maxPoints = 420
) {
  const step =
    Math.max(
      1,
      Math.ceil(
        coordinates.length /
        maxPoints
      )
    );

  const sampled = [];

  for (
    let i = 0;
    i < coordinates.length;
    i += step
  ) {
    sampled.push(
      coordinates[i]
    );
  }

  if (
    coordinates.length > 1
  ) {
    const last =
      coordinates[
        coordinates.length - 1
      ];

    const previous =
      sampled[
        sampled.length - 1
      ];

    if (
      !previous ||
      previous[0] !== last[0] ||
      previous[1] !== last[1]
    ) {
      sampled.push(last);
    }
  }

  return sampled.map(
    ([lng, lat]) => {
      const point =
        map.project({
          lng,
          lat
        });

      return {
        x: point.x,
        y: point.y
      };
    }
  );
}


function getProjectedCoastlinePaths() {
  return extractLinePaths(
    coastlineGeoJSON
  )
    .map(path =>
      projectCoordinatePath(
        path
      )
    )
    .filter(
      path =>
        path.length > 1
    );
}


function getProjectedBoundaryRings() {
  return extractOuterRings(
    boundaryGeoJSON
  )
    .map(ring =>
      projectCoordinatePath(
        ring,
        520
      )
    )
    .filter(
      ring =>
        ring.length > 2
    );
}


function projectedPathsToSvgPath(
  paths,
  close = false
) {
  return paths
    .map(path => {
      if (!path.length) {
        return "";
      }

      const [
        first,
        ...rest
      ] = path;

      return (
        `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} ` +

        rest
          .map(point =>
            `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
          )
          .join(" ") +

        (
          close
            ? " Z"
            : ""
        )
      );
    })
    .join(" ");
}


function getProjectedBounds(paths) {
  const points =
    paths.flat();

  if (!points.length) {
    return null;
  }

  const xs =
    points.map(
      point =>
        point.x
    );

  const ys =
    points.map(
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
   COLOUR + INTENSITY
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
        clean.slice(0, 2),
        16
      ),

    g:
      parseInt(
        clean.slice(2, 4),
        16
      ),

    b:
      parseInt(
        clean.slice(4, 6),
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
      (b.r - a.r) *
      amount
    );

  const g =
    Math.round(
      a.g +
      (b.g - a.g) *
      amount
    );

  const blue =
    Math.round(
      a.b +
      (b.b - a.b) *
      amount
    );

  return (
    `rgb(${r}, ${g}, ${blue})`
  );
}


function colourForYearPosition(
  position
) {
  const scaled =
    position *
    (
      YEAR_COLOURS.length - 1
    );

  const index =
    Math.min(
      Math.floor(scaled),
      YEAR_COLOURS.length - 2
    );

  return interpolateColour(
    YEAR_COLOURS[index],
    YEAR_COLOURS[
      index + 1
    ],
    scaled - index
  );
}


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

  if (!values.length) {
    return 1;
  }

  /*
   * Use the 98th percentile so
   * one extreme storm cannot
   * flatten the whole year.
   */

  const index =
    Math.floor(
      (
        values.length - 1
      ) *
      0.98
    );

  return Math.max(
    values[index],
    1
  );
}


function intensityForValue(
  value,
  intensityCap
) {
  if (
    value <= 0
  ) {
    return 0;
  }

  const raw =
    Math.log1p(value) /
    intensityCap;

  return Math.max(
    0,
    Math.min(
      1,
      raw
    )
  );
}


/* =========================================================
   SVG
   ========================================================= */

function ensureSvg() {
  let svg =
    document.getElementById(
      "lightning-stack"
    );

  if (svg) {
    return svg;
  }

  const container =
    map.getContainer();

  svg =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );

  svg.id =
    "lightning-stack";

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

  container.appendChild(
    svg
  );

  return svg;
}


function createSvgPath({
  d,
  stroke,
  strokeWidth,
  strokeOpacity,
  fill = "none",
  fillOpacity = 0,
  transform = null,
  filter = null
}) {
  const path =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );

  path.setAttribute(
    "d",
    d
  );

  path.setAttribute(
    "fill",
    fill
  );

  path.setAttribute(
    "fill-opacity",
    fillOpacity
  );

  path.setAttribute(
    "stroke",
    stroke
  );

  path.setAttribute(
    "stroke-width",
    strokeWidth
  );

  path.setAttribute(
    "stroke-opacity",
    strokeOpacity
  );

  path.setAttribute(
    "stroke-linejoin",
    "round"
  );

  path.setAttribute(
    "stroke-linecap",
    "round"
  );

  path.setAttribute(
    "vector-effect",
    "non-scaling-stroke"
  );

  if (transform) {
    path.setAttribute(
      "transform",
      transform
    );
  }

  if (filter) {
    path.style.filter =
      filter;
  }

  return path;
}


/* =========================================================
   STACK SPACING
   ========================================================= */

function getStackHeight(
  containerHeight
) {
  return Math.min(
    330,
    Math.max(
      220,
      containerHeight * 0.44
    )
  );
}


function getMonthGap(
  containerHeight
) {
  return Math.min(
    5.5,
    Math.max(
      3.4,
      containerHeight * 0.005
    )
  );
}


function layerOffsetForDay({
  dayIndex,
  monthIndex,
  totalDays,
  containerHeight
}) {
  const stackHeight =
    getStackHeight(
      containerHeight
    );

  const monthGap =
    getMonthGap(
      containerHeight
    );

  const totalGap =
    monthGap * 11;

  const usableHeight =
    Math.max(
      120,
      stackHeight -
      totalGap
    );

  const daySpacing =
    usableHeight /
    Math.max(
      1,
      totalDays - 1
    );

  /*
   * Jan stays nearest the base map.
   * Dec moves highest.
   */

  return -(
    dayIndex *
    daySpacing +

    monthIndex *
    monthGap
  ) *
  stackProgress;
}


/* =========================================================
   EXPLORE ENVIRONMENT
   ========================================================= */

function drawExploreEnvironment({
  svg,
  width,
  height,
  boundaryPath
}) {
  if (
    viewMode !== "explore" ||
    stackProgress <= 0.001
  ) {
    return;
  }


  /*
   * Everything outside HK fades
   * almost completely into black.
   */

  const dimOpacity =
    0.88 *
    stackProgress;

  const blackout =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );

  blackout.setAttribute(
    "d",
    (
      `M 0 0 ` +
      `H ${width} ` +
      `V ${height} ` +
      `H 0 Z ` +
      boundaryPath
    )
  );

  blackout.setAttribute(
    "fill",
    `rgba(0,0,0,${dimOpacity})`
  );

  blackout.setAttribute(
    "fill-rule",
    "evenodd"
  );

  svg.appendChild(
    blackout
  );


  /*
   * Floating-map depth.
   */

  const depth =
    54 *
    stackProgress;


  const shadow =
    createSvgPath({
      d:
        boundaryPath,

      stroke:
        "#000000",

      strokeWidth:
        18,

      strokeOpacity:
        0.48 *
        stackProgress,

      fill:
        "rgba(0,0,0,0.42)",

      fillOpacity:
        0.42 *
        stackProgress,

      transform:
        `translate(0 ${depth + 10})`,

      filter:
        `blur(${8 * stackProgress}px)`
    });

  svg.appendChild(
    shadow
  );


  /*
   * Repeated silhouettes give the
   * Hong Kong map visible thickness.
   */

  const copies = 7;

  for (
    let i = copies;
    i >= 1;
    i -= 1
  ) {
    const ratio =
      i / copies;

    const offset =
      depth * ratio;

    const slab =
      createSvgPath({
        d:
          boundaryPath,

        stroke:
          i <= 2
            ? "#B8C0FF"
            : "#555D78",

        strokeWidth:
          i <= 2
            ? 1.2
            : 1.0,

        strokeOpacity:
          (
            0.16 +
            (
              1 - ratio
            ) *
            0.22
          ) *
          stackProgress,

        fill:
          i >= 5
            ? "rgba(12,14,24,0.30)"
            : "rgba(91,98,138,0.08)",

        fillOpacity:
          0.15 *
          stackProgress,

        transform:
          `translate(0 ${offset})`
      });

    svg.appendChild(
      slab
    );
  }


  /*
   * Bright top edge.
   */

  const topEdge =
    createSvgPath({
      d:
        boundaryPath,

      stroke:
        "#E4E7FF",

      strokeWidth:
        1.25,

      strokeOpacity:
        0.78 *
        stackProgress,

      fill:
        "rgba(147,155,214,0.08)",

      fillOpacity:
        0.08 *
        stackProgress,

      filter:
        (
          `drop-shadow(` +
          `0 0 ${6 * stackProgress}px ` +
          `rgba(174,182,255,0.55))`
        )
    });

  svg.appendChild(
    topEdge
  );
}


/* =========================================================
   MONTH LABELS
   ========================================================= */

function drawMonthLabels({
  svg,
  bounds,
  calendar,
  containerHeight
}) {
  if (
    viewMode !== "explore" ||
    stackProgress < 0.2
  ) {
    return;
  }

  const starts =
    monthStartIndices(
      selectedYear
    );

  const labelX =
    Math.max(
      28,
      bounds.minX - 48
    );

  const baseY =
    (
      bounds.minY +
      bounds.maxY
    ) / 2;


  starts.forEach(
    (
      dayIndex,
      monthIndex
    ) => {
      const offset =
        layerOffsetForDay({
          dayIndex,
          monthIndex,
          totalDays:
            calendar.length,
          containerHeight
        });

      const colour =
        colourForYearPosition(
          dayIndex /
          Math.max(
            1,
            calendar.length - 1
          )
        );

      const text =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );

      text.setAttribute(
        "x",
        labelX
      );

      text.setAttribute(
        "y",
        baseY + offset
      );

      text.setAttribute(
        "fill",
        colour
      );

      text.setAttribute(
        "fill-opacity",
        0.30 +
        0.65 *
        stackProgress
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
        "600"
      );

      text.setAttribute(
        "letter-spacing",
        "1.4"
      );

      text.setAttribute(
        "text-anchor",
        "end"
      );

      text.textContent =
        MONTH_NAMES[
          monthIndex
        ];

      svg.appendChild(
        text
      );
    }
  );
}


/* =========================================================
   DRAW 365 LAYERS
   ========================================================= */

function drawLightningStack() {
  if (
    !coastlineGeoJSON ||
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
   * Coastline:
   * the actual shape repeated
   * once for every day.
   */

  const coastlinePaths =
    getProjectedCoastlinePaths();

  const boundaryRings =
    getProjectedBoundaryRings();

  if (
    !coastlinePaths.length ||
    !boundaryRings.length
  ) {
    return;
  }


  const coastlinePath =
    projectedPathsToSvgPath(
      coastlinePaths,
      false
    );

  const boundaryPath =
    projectedPathsToSvgPath(
      boundaryRings,
      true
    );

  const bounds =
    getProjectedBounds(
      boundaryRings
    );


  if (
    !coastlinePath ||
    !boundaryPath ||
    !bounds
  ) {
    return;
  }


  drawExploreEnvironment({
    svg,
    width,
    height,
    boundaryPath
  });


  const calendar =
    buildCalendarYear(
      selectedYear
    );

  const intensityCap =
    getIntensityCap(
      calendar
    );


  const coreGroup =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );

  coreGroup.style.mixBlendMode =
    "screen";


  const glowGroup =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );

  glowGroup.style.mixBlendMode =
    "screen";

  glowGroup.style.filter =
    "blur(1.9px)";


  calendar.forEach(
    (
      item,
      dayIndex
    ) => {
      const value =
        item.record
          ? item.record.value
          : 0;


      const intensity =
        intensityForValue(
          value,
          intensityCap
        );


      const shaped =
        Math.pow(
          intensity,
          0.72
        );


      const colour =
        colourForYearPosition(
          dayIndex /
          Math.max(
            1,
            calendar.length - 1
          )
        );


      /*
       * THIS is the temporal axis.
       *
       * Jan = bottom
       * Dec = top
       */

      const offsetY =
        layerOffsetForDay({
          dayIndex,
          monthIndex:
            item.monthIndex,

          totalDays:
            calendar.length,

          containerHeight:
            height
        });


      const transform =
        `translate(0 ${offsetY.toFixed(2)})`;


      /*
       * When stackProgress = 0:
       * all 365 outlines overlap.
       *
       * When stackProgress = 1:
       * all 365 days unfold vertically.
       */

      const overviewFactor =
        1 -
        stackProgress;

      const exploreFactor =
        stackProgress;


      /*
       * Main line.
       *
       * Lightning count controls:
       * opacity + thickness.
       */

      const coreOpacity =
        value > 0

          ? (
              0.018 *
              overviewFactor

              +

              (
                0.09 +
                shaped *
                0.50
              ) *
              exploreFactor
            )

          : (
              0.004 *
              overviewFactor

              +

              0.025 *
              exploreFactor
            );


      const coreWidth =
        value > 0
          ? 0.42 +
            shaped *
            1.15
          : 0.32;


      const core =
        createSvgPath({
          d:
            coastlinePath,

          stroke:
            colour,

          strokeWidth:
            coreWidth,

          strokeOpacity:
            coreOpacity,

          transform
        });

      coreGroup.appendChild(
        core
      );


      /*
       * Glow only for active days.
       */

      if (
        value > 0
      ) {
        const glowOpacity =
          0.006 *
          overviewFactor

          +

          (
            0.035 +
            shaped *
            0.16
          ) *
          exploreFactor;


        const glow =
          createSvgPath({
            d:
              coastlinePath,

            stroke:
              colour,

            strokeWidth:
              1.8 +
              shaped *
              3.4,

            strokeOpacity:
              glowOpacity,

            transform
          });

        glowGroup.appendChild(
          glow
        );
      }
    }
  );


  svg.appendChild(
    glowGroup
  );

  svg.appendChild(
    coreGroup
  );


  drawMonthLabels({
    svg,
    bounds,
    calendar,
    containerHeight:
      height
  });
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

      drawLightningStack();
    }
  );
}


/* =========================================================
   ANIMATION
   ========================================================= */

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 -
      Math.pow(
        -2 * t + 2,
        3
      ) / 2;
}


function animateStackTo(
  target,
  duration = 1700
) {
  if (
    stackAnimationFrame
  ) {
    cancelAnimationFrame(
      stackAnimationFrame
    );
  }

  const startValue =
    stackProgress;

  const difference =
    target -
    startValue;

  const startTime =
    performance.now();


  function frame(now) {
    const elapsed =
      now -
      startTime;

    const raw =
      Math.min(
        1,
        elapsed /
        duration
      );

    const eased =
      easeInOutCubic(
        raw
      );

    stackProgress =
      startValue +
      difference *
      eased;

    drawLightningStack();


    if (
      raw < 1
    ) {
      stackAnimationFrame =
        requestAnimationFrame(
          frame
        );
    }

    else {
      stackProgress =
        target;

      stackAnimationFrame =
        null;

      drawLightningStack();
    }
  }


  stackAnimationFrame =
    requestAnimationFrame(
      frame
    );
}


/* =========================================================
   EXPLORE MODE
   ========================================================= */

function enterExploreMode() {
  if (
    viewMode ===
    "explore"
  ) {
    return;
  }

  viewMode =
    "explore";


  /*
   * Hong Kong tilts into
   * 2.5D perspective.
   */

  map.easeTo({
    center: [
      114.15,
      22.34
    ],

    zoom:
      10.35,

    pitch:
      58,

    bearing:
      -18,

    duration:
      1700,

    essential:
      true
  });


  /*
   * At the same time:
   *
   * 365 overlapped outlines
   * unfold vertically.
   */

  animateStackTo(
    1,
    1750
  );
}


function leaveExploreMode() {
  viewMode =
    "overview";

  animateStackTo(
    0,
    1100
  );
}


/* =========================================================
   INTERACTION
   ========================================================= */

function clickIsOnHongKong(
  event
) {
  if (
    !map.getLayer(
      HK_LAYER_ID
    )
  ) {
    return false;
  }

  const hits =
    map.queryRenderedFeatures(
      event.point,
      {
        layers: [
          HK_LAYER_ID
        ]
      }
    );

  return (
    hits.length > 0
  );
}


function attachInteraction() {
  if (
    interactionAttached
  ) {
    return;
  }

  interactionAttached =
    true;


  map.on(
    "click",
    event => {
      if (
        viewMode ===
        "overview" &&
        clickIsOnHongKong(
          event
        )
      ) {
        enterExploreMode();
      }
    }
  );


  map.on(
    "mousemove",
    event => {
      if (
        viewMode ===
        "explore"
      ) {
        map
          .getCanvas()
          .style.cursor =
            "grab";

        return;
      }

      map
        .getCanvas()
        .style.cursor =
          clickIsOnHongKong(
            event
          )
            ? "pointer"
            : "";
    }
  );


  map.on(
    "move",
    scheduleRedraw
  );


  map.on(
    "resize",
    scheduleRedraw
  );


  document
    .getElementById(
      "reset-view"
    )
    ?.addEventListener(
      "click",
      () => {
        leaveExploreMode();
      }
    );
}


/* =========================================================
   START
   ========================================================= */

async function initialiseLightning() {
  const [
    _,
    coastline,
    boundary
  ] =
    await Promise.all([
      loadLightningData(),

      loadJSON(
        COASTLINE_PATH
      ),

      loadJSON(
        BOUNDARY_PATH
      )
    ]);


  coastlineGeoJSON =
    coastline;

  boundaryGeoJSON =
    boundary;


  showYearSummary(
    DEFAULT_YEAR
  );


  const start =
    () => {
      drawLightningStack();

      attachInteraction();

      console.log(
        "Thunder Rhythm 365-layer temporal stack ready."
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