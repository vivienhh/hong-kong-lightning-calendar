# /// script
# requires-python = ">=3.10"
# dependencies = ["matplotlib"]
# ///

"""
Explore Hong Kong lightning data as a year-by-day heatmap.

Run:
uv run plot.py
"""

import csv
import datetime as dt
import math
from pathlib import Path

import matplotlib.pyplot as plt

FILE = "daily_HK_LGTG_ALL.csv"
PICTURE = "lightning-heatmap-log.png"

HERE = Path(__file__).parent
DATA = HERE / "data" / FILE
OUT = HERE / "out"


def rows(path):
    """Keep only the data rows that start with a year."""
    kept = []

    with path.open(encoding="utf-8-sig", newline="") as handle:
        for line in csv.reader(handle):
            if line and line[0].isdigit():
                kept.append(line)

    return kept


def main():
    table = rows(DATA)

    print(f"{DATA.name}: {len(table)} rows")
    print(f"first row: {table[0]}")

    years = sorted({int(row[0]) for row in table})

    # One row per year, one column per day of year.
    # NaN means that no value exists for that date.
    matrix = [
        [math.nan for _ in range(366)]
        for _ in years
    ]

    year_index = {
        year: i
        for i, year in enumerate(years)
    }

    values = []

    for year, month, day, value, quality in table:
        if value == "***":
            continue

        year = int(year)
        month = int(month)
        day = int(day)
        count = float(value)

        date = dt.date(year, month, day)
        day_of_year = date.timetuple().tm_yday

        matrix[year_index[year]][day_of_year - 1] = math.log1p(count)
        values.append(count)

    print(f"years: {years[0]} to {years[-1]}")
    print(f"{len(values)} lightning values")
    print(f"minimum: {min(values)}")
    print(f"maximum: {max(values)}")

    fig, ax = plt.subplots(figsize=(13, 7))

    image = ax.imshow(
        matrix,
        aspect="auto",
        interpolation="nearest"
    )

    ax.set_xlabel("day of year")
    ax.set_ylabel("year")
    ax.set_title("Hong Kong Cloud-to-Ground Lightning, 2005–2026")

    ax.set_yticks(range(len(years)))
    ax.set_yticklabels(years)

    ax.set_xticks([0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334])
    ax.set_xticklabels(
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    )

    colourbar = fig.colorbar(image, ax=ax)
    colourbar.set_label("log(1 + daily lightning count)")

    fig.tight_layout()

    OUT.mkdir(exist_ok=True)
    fig.savefig(OUT / PICTURE, dpi=150)

    print(f"saved out/{PICTURE}")

    plt.show()


if __name__ == "__main__":
    main()