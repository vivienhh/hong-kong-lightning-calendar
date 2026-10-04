# Thunder Rhythm: Hong Kong Lightning Calendar

**Thunder Rhythm** is an interactive visualisation of daily cloud-to-ground lightning activity in Hong Kong, using open data from the Hong Kong Observatory.

I chose lightning because its pattern changes a lot over time. Some periods are almost completely quiet, while others contain very concentrated bursts. I wanted to see how these changes appear not only within one year, but also across years, months and individual days.

![Thunder Rhythm overview](out/thunder-rhythm-overview.png)

## The phenomenon

The dataset records daily cloud-to-ground lightning activity across the whole Hong Kong territory from 2005 to 2026.

At the beginning of the project, I was mainly interested in the seasonal pattern of lightning. After testing the data in several forms, I found that looking at only one year did not show enough of the longer-term variation. The final version therefore lets the user move between three time scales:

**2005–2026 → Year → Month → Day**

The overview compares different years, the Year view shows the monthly pattern within one selected year, and the Month view makes individual daily values easier to inspect.

## The source

The data comes from the Hong Kong Observatory open-data service:

https://data.weather.gov.hk/weatherAPI/cis/csvfile/HK/ALL/daily_HK_LGTG_ALL.csv

The committed CSV contains **7,742 daily records**. Each row includes the year, month, day, daily cloud-to-ground lightning count and a completeness flag.

The original CSV is stored in `data/`, so the project can still be generated without downloading the source again.

The available records begin on **21 June 2005** and currently end on **31 August 2026**. Because these two years are incomplete, I treat them as partial coverage rather than directly comparing them with complete years. Missing records are also kept separate from days with a real value of zero.

## What the visualisation shows

### Level 1 — Year overview

![Thunder Rhythm year overview](out/thunder-rhythm-overview.png)

The first view shows all years from 2005 to 2026 as luminous concentric orbits.

Radius represents chronology, while each year has its own colour identity. The overall thickness and brightness respond to the annual lightning total, and smaller changes in light around the orbit reflect monthly activity. Strong daily events appear as brighter local flares.

The chart in the lower-right corner shows the annual totals more directly. Hovering over a bar gives the year and its recorded lightning count.

### Level 2 — Year detail

![Thunder Rhythm 2025 year detail](out/thunder-rhythm-year-2025.png)

Clicking a year isolates it and opens twelve Month structures around the selected Year orbit.

Each Month contains a set of concentric Daily rings. The selected year keeps the same colour family as it had in the overview, while stronger values become brighter and thicker.

The chart in the lower-right corner changes to monthly totals from January to December. Hovering over either a Month structure or a chart bar shows the corresponding value.

### Level 3 — Month detail

![Thunder Rhythm July 2025 daily detail](out/thunder-rhythm-july-2025.png)

Clicking a month opens the Daily view. In this screenshot, the selected month is **July 2025**.

Each ring represents one calendar day. Day 01 starts from the inside, and later days move outward. Days with stronger lightning activity appear brighter and thicker.

The chart now shows daily lightning counts in chronological order. Hovering over a ring or a bar gives the exact date and value.

## Design development

The final visualisation came from several earlier experiments.

I first made a simple plot to inspect the downloaded data, then compared raw and logarithmic heatmaps. After that, I developed a radial calendar for 2025, where each day became an angle around a circle and the lightning count controlled the length of a radial bar.

That version helped me understand the seasonal pattern, but it was still limited to one year and became difficult to use for comparison.

I then moved toward the current hierarchical structure. Instead of putting every daily value into one image, the visualisation starts with the long-term overview and lets the user open more detail only when needed.

This process also changed how I used the data visually. The final version combines a more expressive light-based representation with small quantitative bar charts, so the overall rhythm and the exact values can be read together.

## Interaction

Hovering over a Year, Month or Daily ring reveals its lightning value. Clicking a Year opens the monthly level, and clicking an available Month opens the daily level. The structure can be rotated by dragging, while the overview can also be zoomed with the scroll wheel.

The bar charts at all three levels can also be hovered to read the corresponding year, month or day and its value. Short fade transitions are used when moving between levels so that the change does not feel like an abrupt jump.

## Run it

Fetch and inspect the data:

```bash
uv run fetch.py
uv run plot.py