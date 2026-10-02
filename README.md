# Thunder Rhythm: Hong Kong Lightning Calendar

This project explores daily cloud-to-ground lightning activity over Hong Kong territory using open data published by the Hong Kong Observatory. I chose lightning because it has a strong temporal rhythm: quiet periods and intense bursts repeat through the year, but the strength and timing of those events vary from day to day and from year to year.

![Hong Kong Lightning Calendar — 2025](out/lightning-radial-2025.png)

## The phenomenon

The phenomenon is daily cloud-to-ground lightning activity in Hong Kong. The dataset covers records from 2005 to 2026. Lightning is highly seasonal in Hong Kong, so I wanted to explore when activity becomes more intense during the year and how daily variation can be made visible through different visual transformations.

During the process, I first tested the data as a simple plot, then compared a raw heatmap with a logarithmic heatmap, and later developed a radial calendar. In the radial version, the day of the year becomes an angle around a circle, while the daily lightning count controls the length of the radial bar.

## The source

The data comes from the Hong Kong Observatory open-data service:

https://data.weather.gov.hk/weatherAPI/cis/csvfile/HK/ALL/daily_HK_LGTG_ALL.csv

The committed CSV file contains 7,742 daily records. Each data row includes the year, month, day, daily cloud-to-ground lightning count, and a quality flag. The raw file is stored unchanged in `data/` so that the visualisation can be generated without downloading the data again.

## What the picture shows

The current picture shows the daily lightning rhythm for 2025 as a radial calendar. Each position around the circle represents a day of the year, beginning in January and moving clockwise. The height of each bar is based on `log(1 + daily lightning count)`, which makes moderate lightning days easier to see instead of allowing a few extremely large values to dominate the whole picture.

This transformation also hides something. The logarithmic scale compresses the true difference between moderate and extreme lightning days, so the visual length of a bar should not be read as the original lightning count. The current radial prototype also focuses on one year at a time, so it does not yet show long-term differences between all years.

## Run it

```bash
uv run fetch.py
uv run plot.py