const LIGHTNING_DATA_PATH =
  "./data/daily_HK_LGTG_ALL.csv";

const COASTLINE_PATH =
  "./data/hong-kong-coastline.geojson";

const BOUNDARY_PATH =
  "./data/hong-kong-boundary-precise.geojson";

const DEFAULT_YEAR = 2025;

const HK_CENTER = {
  lng: 114.15,
  lat: 22.34
};

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

let coastlineCoordinatePaths = [];

let selectedYear = DEFAULT_YEAR;
let viewMode = "overview";

let redrawQueued = false;


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


function getDayOfYear(
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


function getRecordsForYear(year) {
  return lightningRecords
    .filter(record =>
      record.year === year
    )
    .sort((a, b) =>
      (a.month - b.month) ||
      (a.day - b.day)
    );
}


function buildCalendarYear(year) {
  const calendar =
    Array.from(
      {
        length: daysInYear(year)
      },
      (_, index) => ({
        index,
        record: null
      })
    );

  getRecordsForYear(year)
    .forEach(record => {
      const index =
        getDayOfYear(
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
   SUMMARY
   ========================================================= */

function showYearSummary(year) {
  const records =
    getRecordsForYear(year);

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
   COASTLINE EXTRACTION
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
    value.features.forEach(
      feature =>
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
    value.geometries.forEach(
      geometry =>
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
      .forEach(
        line =>
          result.push(line)
      );
  }

  else if (
    value.type ===
    "Polygon"
  ) {
    value.coordinates
      .forEach(
        ring =>
          result.push(ring)
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
              result.push(ring)
          )
      );
  }

  return result;
}


/*
 * Reduce extremely dense coastline paths once.
 * This keeps the true coastline geometry but
 * makes animation much smoother.
 */

function prepareCoastlinePaths() {
  const raw =
    extractLinePaths(
      coastlineGeoJSON
    );

  coastlineCoordinatePaths =
    raw
      .map(path => {
        const step =
          Math.max(
            1,
            Math.ceil(
              path.length / 650
            )
          );

        const sampled = [];

        for (
          let i = 0;
          i < path.length;
          i += step
        ) {
          sampled.push(
            path[i]
          );
        }

        if (
          path.length > 1
        ) {
          sampled.push(
            path[
              path.length - 1
            ]
          );
        }

        return sampled;
      })
      .filter(
        path =>
          path.length > 1
      );
}


/* =========================================================
   PROJECT COASTLINE
   ========================================================= */

function projectCoastlinePaths() {
  const centre =
    map.project(
      HK_CENTER
    );

  const projected =
    coastlineCoordinatePaths
      .map(path =>
        path.map(
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
        )
      );

  /*
   * Sort coastline fragments clockwise
   * around Hong Kong.
   *
   * This keeps the 365-day sequence
   * visually moving around the territory.
   */
  return projected
    .map(path => {
      const centroid =
        path.reduce(
          (sum, point) => ({
            x:
              sum.x + point.x,
            y:
              sum.y + point.y
          }),
          {
            x: 0,
            y: 0
          }
        );

      centroid.x /=
        path.length;

      centroid.y /=
        path.length;

      const angle =
        Math.atan2(
          centroid.y -
          centre.y,
          centroid.x -
          centre.x
        );

      return {
        path,
        angle
      };
    })
    .sort(
      (a, b) =>
        a.angle - b.angle
    )
    .map(
      item =>
        item.path
    );
}


/* =========================================================
   ARC-LENGTH SAMPLING
   =========================================================
 *
 * This is the important change.
 *
 * We NO LONGER choose coastline positions
 * by radial angle.
 *
 * Instead, the 365 days are distributed
 * continuously along the real white
 * coastline geometry according to its
 * actual screen length.
 *
 * Therefore:
 *
 * no strange bunching,
 * no fake radial fan,
 * no ocean connection lines.
 */

function pointDistance(a, b) {
  return Math.hypot(
    b.x - a.x,
    b.y - a.y
  );
}


function buildCoastlineSegments(
  projectedPaths
) {
  const segments = [];

  let totalLength = 0;

  projectedPaths
    .forEach(path => {
      for (
        let i = 0;
        i <
          path.length - 1;
        i += 1
      ) {
        const start =
          path[i];

        const end =
          path[i + 1];

        const length =
          pointDistance(
            start,
            end
          );

        if (
          length < 0.25
        ) {
          continue;
        }

        segments.push({
          start,
          end,
          length,
          startDistance:
            totalLength
        });

        totalLength +=
          length;
      }
    });

  return {
    segments,
    totalLength
  };
}


function sampleCoastline(
  projectedPaths,
  count
) {
  const {
    segments,
    totalLength
  } =
    buildCoastlineSegments(
      projectedPaths
    );

  if (
    !segments.length ||
    totalLength <= 0
  ) {
    return [];
  }

  const samples = [];

  let segmentIndex = 0;

  for (
    let i = 0;
    i < count;
    i += 1
  ) {
    const target =
      totalLength *
      (
        (i + 0.5) /
        count
      );

    while (
      segmentIndex <
        segments.length - 1 &&
      target >
        segments[
          segmentIndex
        ].startDistance +
        segments[
          segmentIndex
        ].length
    ) {
      segmentIndex += 1;
    }

    const segment =
      segments[
        segmentIndex
      ];

    const local =
      Math.max(
        0,
        Math.min(
          1,
          (
            target -
            segment.startDistance
          ) /
          segment.length
        )
      );

    samples.push({
      x:
        segment.start.x +
        (
          segment.end.x -
          segment.start.x
        ) *
        local,

      y:
        segment.start.y +
        (
          segment.end.y -
          segment.start.y
        ) *
        local
    });
  }

  return samples;
}


/* =========================================================
   BOUNDARY FOR FOCUS MASK
   ========================================================= */

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
    value.features.forEach(
      feature =>
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
      .forEach(
        polygon => {
          if (
            polygon[0]
          ) {
            result.push(
              polygon[0]
            );
          }
        }
      );
  }

  return result;
}


function projectedBoundaryRings() {
  return extractOuterRings(
    boundaryGeoJSON
  ).map(
    ring =>
      ring.map(
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
      )
  );
}


function ringsToPath(rings) {
  return rings
    .map(ring => {
      if (!ring.length) {
        return "";
      }

      const [
        first,
        ...rest
      ] = ring;

      return (
        `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} ` +
        rest
          .map(
            point =>
              `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
          )
          .join(" ") +
        " Z"
      );
    })
    .join(" ");
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

  const r =
    Math.round(
      a.r +
      (
        b.r -
        a.r
      ) *
      amount
    );

  const g =
    Math.round(
      a.g +
      (
        b.g -
        a.g
      ) *
      amount
    );

  const blue =
    Math.round(
      a.b +
      (
        b.b -
        a.b
      ) *
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
    scaled - index
  );
}


/* =========================================================
   SVG
   ========================================================= */

function ensureSvg() {
  let svg =
    document.getElementById(
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


function makeSvgLine({
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
   EXPLORE MODE BACKGROUND + FLOATING LAND
   ========================================================= */

function drawExploreEnvironment(
  svg,
  width,
  height
) {
  if (
    viewMode !==
    "explore"
  ) {
    return;
  }

  const rings =
    projectedBoundaryRings();

  if (!rings.length) {
    return;
  }

  const territoryPath =
    ringsToPath(
      rings
    );


  /*
   * 1. Nearly black everything
   *    outside Hong Kong.
   */

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
      territoryPath
    )
  );

  blackout.setAttribute(
    "fill",
    "rgba(0, 0, 0, 0.86)"
  );

  blackout.setAttribute(
    "fill-rule",
    "evenodd"
  );

  svg.appendChild(
    blackout
  );


  /*
   * 2. Deep shadow underneath HK.
   */

  const shadow =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );

  shadow.setAttribute(
    "d",
    territoryPath
  );

  shadow.setAttribute(
    "fill",
    "rgba(0,0,0,0.55)"
  );

  shadow.setAttribute(
    "stroke",
    "#000000"
  );

  shadow.setAttribute(
    "stroke-width",
    "14"
  );

  shadow.setAttribute(
    "transform",
    "translate(0 52)"
  );

  shadow.style.filter =
    "blur(12px)";

  svg.appendChild(
    shadow
  );


  /*
   * 3. Layered thickness.
   *
   * These repeated silhouettes make
   * Hong Kong look like a floating slab.
   */

  const depthOffsets =
    [
      46,
      38,
      30,
      22,
      14,
      7
    ];

  depthOffsets.forEach(
    (
      offset,
      index
    ) => {
      const depth =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );

      depth.setAttribute(
        "d",
        territoryPath
      );

      depth.setAttribute(
        "transform",
        `translate(0 ${offset})`
      );

      depth.setAttribute(
        "fill",
        index < 2
          ? "rgba(25,28,42,0.55)"
          : "rgba(73,78,108,0.20)"
      );

      depth.setAttribute(
        "stroke",
        index < 3
          ? "#59607B"
          : "#AEB6FF"
      );

      depth.setAttribute(
        "stroke-width",
        index < 3
          ? "1.4"
          : "1.0"
      );

      depth.setAttribute(
        "stroke-opacity",
        String(
          0.20 +
          index * 0.06
        )
      );

      svg.appendChild(
        depth
      );
    }
  );


  /*
   * 4. Bright top edge.
   */

  const top =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );

  top.setAttribute(
    "d",
    territoryPath
  );

  top.setAttribute(
    "fill",
    "rgba(150,158,210,0.08)"
  );

  top.setAttribute(
    "stroke",
    "#E0E4FF"
  );

  top.setAttribute(
    "stroke-width",
    "1.15"
  );

  top.setAttribute(
    "stroke-opacity",
    "0.72"
  );

  top.style.filter =
    "drop-shadow(0 0 6px rgba(174,182,255,0.35))";

  svg.appendChild(
    top
  );
}


/* =========================================================
   DATA HEIGHT SCALE
   ========================================================= */

function getIntensityScale(
  calendar
) {
  const positiveLogs =
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
    !positiveLogs.length
  ) {
    return 1;
  }

  /*
   * Use the 98th percentile instead
   * of the absolute maximum.
   *
   * One extreme storm can therefore
   * not flatten every other day.
   */

  const index =
    Math.floor(
      (
        positiveLogs.length -
        1
      ) *
      0.98
    );

  return Math.max(
    positiveLogs[index],
    1
  );
}


/* =========================================================
   DRAW DATA CURTAIN
   ========================================================= */

function drawLightningVisual() {
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
   * In Explore mode:
   *
   * first darken the world,
   * then build the floating HK slab.
   */

  drawExploreEnvironment(
    svg,
    width,
    height
  );


  const projectedPaths =
    projectCoastlinePaths();

  const calendar =
    buildCalendarYear(
      selectedYear
    );


  /*
   * 365 points are sampled according
   * to REAL coastline length.
   *
   * This creates the continuous ring
   * you were asking for.
   */

  const anchors =
    sampleCoastline(
      projectedPaths,
      calendar.length
    );


  const intensityCap =
    getIntensityScale(
      calendar
    );


  /*
   * Groups:
   *
   * base = faint 365-day annual curtain
   * glow = atmospheric light
   * core = fine dotted data line
   */

  const baseGroup =
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
    viewMode ===
    "explore"
      ? "blur(2.6px)"
      : "blur(1.8px)";

  glowGroup.style.mixBlendMode =
    "screen";

  coreGroup.style.mixBlendMode =
    "screen";


  calendar.forEach(
    (
      item,
      index
    ) => {
      const anchor =
        anchors[index];

      if (!anchor) {
        return;
      }

      const value =
        item.record
          ? item.record.value
          : 0;


      const rawIntensity =
        value > 0
          ? Math.log1p(
              value
            ) /
            intensityCap
          : 0;


      const intensity =
        Math.min(
          1,
          Math.max(
            0,
            rawIntensity
          )
        );


      const shaped =
        Math.pow(
          intensity,
          0.78
        );


      const colour =
        colourForYearPosition(
          index /
          Math.max(
            1,
            calendar.length - 1
          )
        );


      /*
       * IMPORTANT:
       *
       * Both states use vertical
       * screen-space pillars.
       */

      const baseHeight =
        viewMode ===
        "explore"
          ? 10
          : 7;


      const dataHeight =
        value > 0
          ? (
              viewMode ===
              "explore"

                ? 22 +
                  shaped * 190

                : 12 +
                  shaped * 92
            )
          : baseHeight;


      const x =
        anchor.x;

      const y =
        anchor.y;


      /*
       * Every day gets a faint baseline.
       *
       * That is what turns isolated
       * spikes into a continuous
       * 365-day data curtain.
       */

      baseGroup.appendChild(
        makeSvgLine({
          x1: x,
          y1: y,
          x2: x,
          y2:
            y - baseHeight,
          colour,
          width: 0.55,
          opacity:
            viewMode ===
            "explore"
              ? 0.25
              : 0.18
        })
      );


      /*
       * Glow behind active days.
       */

      if (
        value > 0
      ) {
        glowGroup.appendChild(
          makeSvgLine({
            x1: x,
            y1: y,
            x2: x,
            y2:
              y - dataHeight,
            colour,
            width:
              2.1 +
              shaped * 1.5,
            opacity:
              0.10 +
              shaped * 0.30
          })
        );
      }


      /*
       * Fine dotted filament.
       *
       * This is closer to your
       * reference image than the
       * previous thick neon rods.
       */

      coreGroup.appendChild(
        makeSvgLine({
          x1: x,
          y1: y,
          x2: x,
          y2:
            y - dataHeight,
          colour,
          width:
            value > 0
              ? 0.8
              : 0.45,
          opacity:
            value > 0
              ? 0.42 +
                shaped * 0.52
              : 0.16,
          dash:
            value > 0
              ? "1 2.3"
              : null
        })
      );
    }
  );


  svg.appendChild(
    baseGroup
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

  redrawQueued = true;

  requestAnimationFrame(
    () => {
      redrawQueued = false;

      drawLightningVisual();
    }
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
   * Stronger pitch than before.
   *
   * This gives the floating slab
   * much clearer perspective.
   */

  map.easeTo({
    center: [
      HK_CENTER.lng,
      HK_CENTER.lat
    ],

    zoom:
      10.35,

    pitch:
      62,

    bearing:
      -18,

    duration:
      1700,

    essential:
      true
  });


  scheduleRedraw();
}


function leaveExploreMode() {
  viewMode =
    "overview";

  scheduleRedraw();
}


/* =========================================================
   INTERACTION
   ========================================================= */

function attachInteraction() {
  map.on(
    "click",
    event => {
      if (
        viewMode ===
        "explore"
      ) {
        return;
      }

      const hits =
        map.queryRenderedFeatures(
          event.point,
          {
            layers: [
              "hong-kong-lavender"
            ]
          }
        );

      if (
        hits.length > 0
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

      const hits =
        map.queryRenderedFeatures(
          event.point,
          {
            layers: [
              "hong-kong-lavender"
            ]
          }
        );

      map.getCanvas()
        .style.cursor =
          hits.length > 0
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


  map.on(
    "move",
    scheduleRedraw
  );

  map.on(
    "resize",
    scheduleRedraw
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


  prepareCoastlinePaths();


  showYearSummary(
    DEFAULT_YEAR
  );


  const start =
    () => {
      drawLightningVisual();

      attachInteraction();

      console.log(
        "Thunder Rhythm continuous coastline curtain ready."
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