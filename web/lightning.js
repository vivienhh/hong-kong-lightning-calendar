const LIGHTNING_DATA_PATH =
  "./data/daily_HK_LGTG_ALL.csv";

const COASTLINE_PATH =
  "./data/hong-kong-coastline.geojson";

const BOUNDARY_PATH =
  "./data/hong-kong-boundary-precise.geojson";

const DEFAULT_YEAR = 2025;
const HK_LAYER_ID = "hong-kong-lavender";

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
let coastlineGeoJSON = null;
let boundaryGeoJSON = null;

let selectedYear = DEFAULT_YEAR;
let viewMode = "overview";
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
  const totalDays =
    daysInYear(year);

  const calendar =
    Array.from(
      {
        length: totalDays
      },

      (_, index) => {
        const date =
          new Date(
            Date.UTC(
              year,
              0,
              index + 1
            )
          );

        return {
          index,
          monthIndex:
            date.getUTCMonth(),

          dayOfMonth:
            date.getUTCDate(),

          record: null
        };
      }
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
      }
    });

  return calendar;
}


/* =========================================================
   MONTH SUMMARY
   ========================================================= */

function getMonthSummaries(
  calendar
) {
  return MONTH_NAMES.map(
    (
      name,
      monthIndex
    ) => {
      const days =
        calendar.filter(
          item =>
            item.monthIndex ===
            monthIndex
        );

      const values =
        days.map(
          item =>
            item.record
              ? item.record.value
              : 0
        );

      const total =
        values.reduce(
          (sum, value) =>
            sum + value,
          0
        );

      const activeDays =
        values.filter(
          value =>
            value > 0
        ).length;

      const startIndex =
        days.length
          ? days[0].index
          : 0;

      return {
        monthIndex,
        name,
        total,
        activeDays,
        startIndex,
        numberOfDays:
          days.length
      };
    }
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
   GEOJSON EXTRACTION
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
   PROJECT TO SCREEN
   ========================================================= */

function projectCoordinatePath(
  coordinates,
  maxPoints = 250
) {
  /*
   * Another important optimisation:
   * simplify the coastline used by the
   * temporal stack.
   *
   * The real geographic form remains,
   * but unnecessary screen-level detail
   * is removed.
   */

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
    sampled.push(
      coordinates[
        coordinates.length - 1
      ]
    );
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


function projectedCoastlinePaths() {
  return extractLinePaths(
    coastlineGeoJSON
  )
    .map(path =>
      projectCoordinatePath(
        path,
        240
      )
    )
    .filter(
      path =>
        path.length > 1
    );
}


function projectedBoundaryRings() {
  return extractOuterRings(
    boundaryGeoJSON
  )
    .map(ring =>
      projectCoordinatePath(
        ring,
        320
      )
    )
    .filter(
      ring =>
        ring.length > 2
    );
}


function pathsToSvgPath(
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


function projectedBounds(paths) {
  const points =
    paths.flat();

  if (!points.length) {
    return null;
  }

  return {
    minX:
      Math.min(
        ...points.map(
          point =>
            point.x
        )
      ),

    maxX:
      Math.max(
        ...points.map(
          point =>
            point.x
        )
      ),

    minY:
      Math.min(
        ...points.map(
          point =>
            point.y
        )
      ),

    maxY:
      Math.max(
        ...points.map(
          point =>
            point.y
        )
      )
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

  return (
    `rgb(` +
    `${Math.round(
      a.r +
      (b.r - a.r) *
      amount
    )}, ` +

    `${Math.round(
      a.g +
      (b.g - a.g) *
      amount
    )}, ` +

    `${Math.round(
      a.b +
      (b.b - a.b) *
      amount
    )}` +
    `)`
  );
}


function colourForPosition(
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


/* =========================================================
   INTENSITY
   ========================================================= */

function percentileCap(
  values,
  percentile = 0.97
) {
  const positive =
    values
      .filter(
        value =>
          value > 0
      )
      .map(
        value =>
          Math.log1p(value)
      )
      .sort(
        (a, b) =>
          a - b
      );

  if (!positive.length) {
    return 1;
  }

  const index =
    Math.floor(
      (
        positive.length - 1
      ) *
      percentile
    );

  return Math.max(
    positive[index],
    1
  );
}


function intensityForValue(
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


/* =========================================================
   STACK SPACING
   ========================================================= */

function getStackLayout(
  calendar,
  height
) {
  /*
   * Target approximately 55–65%
   * of the map viewport.
   */

  const stackHeight =
    Math.min(
      480,
      Math.max(
        330,
        height * 0.61
      )
    );

  /*
   * Bigger month gaps are intentional:
   * the year should clearly read as
   * twelve visual blocks.
   */

  const monthGap = 9;

  const totalMonthGap =
    monthGap * 11;

  const dailySpace =
    (
      stackHeight -
      totalMonthGap
    ) /
    Math.max(
      1,
      calendar.length - 1
    );

  return {
    stackHeight,
    monthGap,
    dailySpace
  };
}


function layerOffset(
  item,
  layout
) {
  return -(
    item.index *
    layout.dailySpace +

    item.monthIndex *
    layout.monthGap
  );
}


/* =========================================================
   SVG ROOT
   ========================================================= */

function ensureSvg() {
  let svg =
    document.getElementById(
      "lightning-stack"
    );

  if (svg) {
    return svg;
  }

  /*
   * Remove legacy experimental SVG
   * if one still exists.
   */

  document
    .getElementById(
      "lightning-halo"
    )
    ?.remove();


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
        "visible",

      transition:
        "opacity 280ms ease"
    }
  );

  map.getContainer()
    .appendChild(svg);

  return svg;
}


function clearSvg(svg) {
  while (
    svg.firstChild
  ) {
    svg.removeChild(
      svg.firstChild
    );
  }
}


/* =========================================================
   SVG HELPERS
   ========================================================= */

function createSvgElement(name) {
  return document
    .createElementNS(
      "http://www.w3.org/2000/svg",
      name
    );
}


function createUse(
  pathId
) {
  const use =
    createSvgElement(
      "use"
    );

  use.setAttribute(
    "href",
    `#${pathId}`
  );

  return use;
}


/* =========================================================
   DEFINITIONS
   ========================================================= */

function buildDefinitions(
  svg,
  coastlinePath
) {
  const defs =
    createSvgElement(
      "defs"
    );


  /*
   * THIS is the key performance change.
   *
   * Hong Kong's coastline exists only
   * ONCE in the SVG document.
   *
   * Every day simply references it
   * using <use>.
   */

  const outline =
    createSvgElement(
      "path"
    );

  outline.id =
    "hk-daily-outline";

  outline.setAttribute(
    "d",
    coastlinePath
  );

  outline.setAttribute(
    "fill",
    "none"
  );

  outline.setAttribute(
    "stroke-linejoin",
    "round"
  );

  outline.setAttribute(
    "stroke-linecap",
    "round"
  );

  outline.setAttribute(
    "vector-effect",
    "non-scaling-stroke"
  );

  defs.appendChild(
    outline
  );


  /*
   * One shared glow filter.
   *
   * Only the strongest days use it.
   */

  const filter =
    createSvgElement(
      "filter"
    );

  filter.id =
    "lightning-strong-glow";

  filter.setAttribute(
    "x",
    "-40%"
  );

  filter.setAttribute(
    "y",
    "-40%"
  );

  filter.setAttribute(
    "width",
    "180%"
  );

  filter.setAttribute(
    "height",
    "180%"
  );


  const blur =
    createSvgElement(
      "feGaussianBlur"
    );

  blur.setAttribute(
    "stdDeviation",
    "2.2"
  );

  blur.setAttribute(
    "result",
    "blur"
  );


  const merge =
    createSvgElement(
      "feMerge"
    );


  const mergeBlur =
    createSvgElement(
      "feMergeNode"
    );

  mergeBlur.setAttribute(
    "in",
    "blur"
  );


  const mergeOriginal =
    createSvgElement(
      "feMergeNode"
    );

  mergeOriginal.setAttribute(
    "in",
    "SourceGraphic"
  );


  merge.appendChild(
    mergeBlur
  );

  merge.appendChild(
    mergeOriginal
  );

  filter.appendChild(
    blur
  );

  filter.appendChild(
    merge
  );

  defs.appendChild(
    filter
  );


  svg.appendChild(
    defs
  );
}


/* =========================================================
   OVERVIEW
   ========================================================= */

function drawOverview(
  svg
) {
  /*
   * Top-down overview does NOT need
   * 365 separate DOM objects.
   *
   * Visually, all 365 layers occupy
   * the same position anyway.
   *
   * One luminous composite outline
   * preserves the concept while being
   * dramatically lighter to render.
   */

  const glow =
    createUse(
      "hk-daily-outline"
    );

  glow.setAttribute(
    "stroke",
    "#AEB6FF"
  );

  glow.setAttribute(
    "stroke-width",
    "6"
  );

  glow.setAttribute(
    "stroke-opacity",
    "0.12"
  );

  glow.setAttribute(
    "filter",
    "url(#lightning-strong-glow)"
  );


  const core =
    createUse(
      "hk-daily-outline"
    );

  core.setAttribute(
    "stroke",
    "#E2E6FF"
  );

  core.setAttribute(
    "stroke-width",
    "1.15"
  );

  core.setAttribute(
    "stroke-opacity",
    "0.78"
  );


  svg.appendChild(
    glow
  );

  svg.appendChild(
    core
  );
}


/* =========================================================
   BACKGROUND DIM + FLOATING MAP
   ========================================================= */

function drawExploreEnvironment(
  svg,
  boundaryPath,
  width,
  height
) {
  /*
   * Almost-black world outside HK.
   */

  const blackout =
    createSvgElement(
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
    "rgba(0,0,0,0.89)"
  );

  blackout.setAttribute(
    "fill-rule",
    "evenodd"
  );

  svg.appendChild(
    blackout
  );


  /*
   * Shadow beneath the Hong Kong slab.
   */

  const shadow =
    createSvgElement(
      "path"
    );

  shadow.setAttribute(
    "d",
    boundaryPath
  );

  shadow.setAttribute(
    "fill",
    "rgba(0,0,0,0.52)"
  );

  shadow.setAttribute(
    "stroke",
    "#000000"
  );

  shadow.setAttribute(
    "stroke-width",
    "16"
  );

  shadow.setAttribute(
    "transform",
    "translate(0 55)"
  );

  shadow.style.filter =
    "blur(10px)";

  svg.appendChild(
    shadow
  );


  /*
   * Floating slab thickness.
   */

  const offsets =
    [
      48,
      40,
      32,
      24,
      16,
      8
    ];

  offsets.forEach(
    (
      offset,
      index
    ) => {
      const slab =
        createSvgElement(
          "path"
        );

      slab.setAttribute(
        "d",
        boundaryPath
      );

      slab.setAttribute(
        "transform",
        `translate(0 ${offset})`
      );

      slab.setAttribute(
        "fill",
        index < 2
          ? "rgba(18,21,34,0.44)"
          : "rgba(86,94,132,0.08)"
      );

      slab.setAttribute(
        "stroke",
        index < 3
          ? "#525A78"
          : "#AEB6FF"
      );

      slab.setAttribute(
        "stroke-width",
        "1"
      );

      slab.setAttribute(
        "stroke-opacity",
        String(
          0.16 +
          index * 0.045
        )
      );

      svg.appendChild(
        slab
      );
    }
  );


  /*
   * Bright top edge.
   */

  const topEdge =
    createSvgElement(
      "path"
    );

  topEdge.setAttribute(
    "d",
    boundaryPath
  );

  topEdge.setAttribute(
    "fill",
    "rgba(150,158,210,0.05)"
  );

  topEdge.setAttribute(
    "stroke",
    "#E3E7FF"
  );

  topEdge.setAttribute(
    "stroke-width",
    "1.1"
  );

  topEdge.setAttribute(
    "stroke-opacity",
    "0.72"
  );

  svg.appendChild(
    topEdge
  );
}


/* =========================================================
   EXPLORE STACK
   ========================================================= */

function drawExploreStack(
  svg,
  calendar,
  bounds,
  height
) {
  const monthSummaries =
    getMonthSummaries(
      calendar
    );

  const layout =
    getStackLayout(
      calendar,
      height
    );


  const dayValues =
    calendar.map(
      item =>
        item.record
          ? item.record.value
          : 0
    );


  const dayCap =
    percentileCap(
      dayValues,
      0.97
    );


  const monthCap =
    percentileCap(
      monthSummaries.map(
        month =>
          month.total
      ),
      1
    );


  /*
   * Find the strongest days.
   * Only these receive expensive glow.
   */

  const activeDays =
    calendar
      .filter(
        item =>
          item.record &&
          item.record.value > 0
      )
      .sort(
        (a, b) =>
          b.record.value -
          a.record.value
      );

  const glowDays =
    new Set(
      activeDays
        .slice(0, 12)
        .map(
          item =>
            item.index
        )
    );


  /*
   * Daily layers
   */

  const dailyGroup =
    createSvgElement(
      "g"
    );

  dailyGroup.style.mixBlendMode =
    "screen";


  calendar.forEach(
    item => {
      const value =
        item.record
          ? item.record.value
          : 0;


      const intensity =
        intensityForValue(
          value,
          dayCap
        );


      const colour =
        colourForPosition(
          item.index /
          Math.max(
            1,
            calendar.length - 1
          )
        );


      const offset =
        layerOffset(
          item,
          layout
        );


      const use =
        createUse(
          "hk-daily-outline"
        );


      use.setAttribute(
        "transform",
        `translate(0 ${offset.toFixed(2)})`
      );


      /*
       * Zero days remain technically
       * represented but nearly disappear.
       */

      if (
        value <= 0
      ) {
        use.setAttribute(
          "stroke",
          colour
        );

        use.setAttribute(
          "stroke-width",
          "0.28"
        );

        use.setAttribute(
          "stroke-opacity",
          "0.012"
        );
      }

      else {
        const shaped =
          Math.pow(
            intensity,
            0.70
          );

        use.setAttribute(
          "stroke",
          colour
        );

        use.setAttribute(
          "stroke-width",
          String(
            0.42 +
            shaped * 1.35
          )
        );

        use.setAttribute(
          "stroke-opacity",
          String(
            0.12 +
            shaped * 0.68
          )
        );


        /*
         * Glow only the strongest
         * twelve days of the year.
         */

        if (
          glowDays.has(
            item.index
          )
        ) {
          use.setAttribute(
            "filter",
            "url(#lightning-strong-glow)"
          );
        }
      }


      dailyGroup.appendChild(
        use
      );
    }
  );


  svg.appendChild(
    dailyGroup
  );


  /*
   * MONTHLY SUMMARY LAYERS
   *
   * Each month receives one stronger
   * Hong Kong contour.
   *
   * This gives the stack a readable
   * Year → Month → Day hierarchy.
   */

  const monthlyGroup =
    createSvgElement(
      "g"
    );

  monthlyGroup.style.mixBlendMode =
    "screen";


  monthSummaries.forEach(
    month => {
      const firstDay =
        calendar[
          month.startIndex
        ];

      if (!firstDay) {
        return;
      }

      const intensity =
        intensityForValue(
          month.total,
          monthCap
        );


      const colour =
        colourForPosition(
          month.startIndex /
          Math.max(
            1,
            calendar.length - 1
          )
        );


      const offset =
        layerOffset(
          firstDay,
          layout
        );


      const monthLayer =
        createUse(
          "hk-daily-outline"
        );


      monthLayer.setAttribute(
        "transform",
        `translate(0 ${offset.toFixed(2)})`
      );

      monthLayer.setAttribute(
        "stroke",
        colour
      );

      monthLayer.setAttribute(
        "stroke-width",
        String(
          0.85 +
          intensity * 2.0
        )
      );

      monthLayer.setAttribute(
        "stroke-opacity",
        String(
          0.30 +
          intensity * 0.52
        )
      );


      monthlyGroup.appendChild(
        monthLayer
      );


      /*
       * Month label
       */

      const text =
        createSvgElement(
          "text"
        );

      const labelX =
        Math.max(
          32,
          bounds.minX - 42
        );


      const labelY =
        bounds.maxY +
        offset -
        4;


      text.setAttribute(
        "x",
        labelX
      );

      text.setAttribute(
        "y",
        labelY
      );

      text.setAttribute(
        "fill",
        colour
      );

      text.setAttribute(
        "fill-opacity",
        "0.92"
      );

      text.setAttribute(
        "font-size",
        "10"
      );

      text.setAttribute(
        "font-family",
        "Arial, Helvetica, sans-serif"
      );

      text.setAttribute(
        "font-weight",
        "700"
      );

      text.setAttribute(
        "letter-spacing",
        "1.5"
      );

      text.setAttribute(
        "text-anchor",
        "end"
      );

      text.textContent =
        month.name;


      svg.appendChild(
        text
      );
    }
  );


  svg.appendChild(
    monthlyGroup
  );
}


/* =========================================================
   RENDER
   ========================================================= */

function renderVisualisation() {
  if (
    !coastlineGeoJSON ||
    !boundaryGeoJSON ||
    lightningRecords.length === 0
  ) {
    return;
  }


  const svg =
    ensureSvg();

  clearSvg(
    svg
  );


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


  const coastlinePaths =
    projectedCoastlinePaths();

  const boundaryRings =
    projectedBoundaryRings();


  const coastlinePath =
    pathsToSvgPath(
      coastlinePaths,
      false
    );

  const boundaryPath =
    pathsToSvgPath(
      boundaryRings,
      true
    );


  const bounds =
    projectedBounds(
      boundaryRings
    );


  if (
    !coastlinePath ||
    !boundaryPath ||
    !bounds
  ) {
    return;
  }


  /*
   * Build the Hong Kong outline ONCE.
   */

  buildDefinitions(
    svg,
    coastlinePath
  );


  if (
    viewMode ===
    "overview"
  ) {
    drawOverview(
      svg
    );

    return;
  }


  drawExploreEnvironment(
    svg,
    boundaryPath,
    width,
    height
  );


  const calendar =
    buildCalendarYear(
      selectedYear
    );


  drawExploreStack(
    svg,
    calendar,
    bounds,
    height
  );
}


/* =========================================================
   CAMERA / PERFORMANCE
   ========================================================= */

function setOverlayOpacity(
  opacity
) {
  const svg =
    document.getElementById(
      "lightning-stack"
    );

  if (svg) {
    svg.style.opacity =
      String(opacity);
  }
}


/*
 * IMPORTANT:
 *
 * We deliberately DO NOT redraw on:
 *
 * map.on("move")
 *
 * anymore.
 *
 * During camera motion the existing
 * overlay simply fades down.
 *
 * Geometry is recalculated ONCE
 * when the camera stops.
 */

function attachMapPerformanceEvents() {
  map.on(
    "movestart",
    () => {
      setOverlayOpacity(
        0.12
      );
    }
  );


  map.on(
    "moveend",
    () => {
      renderVisualisation();

      requestAnimationFrame(
        () => {
          setOverlayOpacity(
            1
          );
        }
      );
    }
  );


  map.on(
    "resize",
    () => {
      renderVisualisation();
    }
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

  return (
    map.queryRenderedFeatures(
      event.point,
      {
        layers: [
          HK_LAYER_ID
        ]
      }
    ).length > 0
  );
}


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
   * No SVG reconstruction while
   * this camera animation runs.
   */

  map.easeTo({
    center: [
      114.15,
      22.34
    ],

    zoom:
      9.95,

    pitch:
      57,

    bearing:
      -18,

    duration:
      1350,

    essential:
      true
  });
}


function leaveExploreMode() {
  viewMode =
    "overview";

  /*
   * Existing Reset button will also
   * move the camera. moveend will
   * redraw the lightweight overview.
   */

  setTimeout(
    () => {
      if (
        !map.isMoving()
      ) {
        renderVisualisation();
        setOverlayOpacity(1);
      }
    },
    80
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
        map.getCanvas()
          .style.cursor =
            "grab";

        return;
      }


      map.getCanvas()
        .style.cursor =
          clickIsOnHongKong(
            event
          )
            ? "pointer"
            : "";
    }
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


  attachMapPerformanceEvents();
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
      renderVisualisation();

      attachInteraction();

      console.log(
        "Thunder Rhythm optimised month-day stack ready."
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