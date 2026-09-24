# /// script
# requires-python = ">=3.10"
# dependencies = ["matplotlib"]
# ///

"""
Explore Hong Kong lightning data as a radial calendar.

Run:
uv run plot.py
"""

import calendar
import csv
import datetime as dt
import math
from pathlib import Path

import matplotlib.pyplot as plt


FILE = "daily_HK_LGTG_ALL.csv"
PICTURE = "lightning-radial-2025.png"

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


def day_to_angle(day_of_year, year):
    """Turn a day of the year into an angle around a full circle."""
    days_in_year = 366 if calendar.isleap(year) else 365
    return 2 * math.pi * (day_of_year - 1) / days_in_year


def main():
    table = rows(DATA)

    # Test the transformation from day-of-year to angle.
    print(f"2025 day 1 -> angle {day_to_angle(1, 2025)}")
    print(f"2025 day 183 -> angle {day_to_angle(183, 2025)}")
    print(f"2025 day 365 -> angle {day_to_angle(365, 2025)}")
    print(f"2024 day 366 -> angle {day_to_angle(366, 2024)}")

    print(f"{DATA.name}: {len(table)} rows")
    print(f"first row: {table[0]}")

    years = sorted({int(row[0]) for row in table})

    values = []

    for year, month, day, value, quality in table:
        if value == "***":
            continue

        count = float(value)
        values.append(count)

    radial_angles = []
    radial_values = []

    for year, month, day, value, quality in table:
        if value == "***":
            continue

        year = int(year)

        if year != 2025:
            continue

        month = int(month)
        day = int(day)
        count = float(value)

        date = dt.date(year, month, day)
        day_of_year = date.timetuple().tm_yday

        radial_angles.append(day_to_angle(day_of_year, year))
        radial_values.append(math.log1p(count))

    print(f"years: {years[0]} to {years[-1]}")
    print(f"{len(values)} lightning values")
    print(f"minimum: {min(values)}")
    print(f"maximum: {max(values)}")

    print(f"2025 radial points: {len(radial_angles)}")
    print(f"first radial angle: {radial_angles[0]}")
    print(f"first radial value: {radial_values[0]}")

    fig, ax = plt.subplots(
        figsize=(8, 8),
        subplot_kw={"projection": "polar"}
    )

    # Put January at the top and move clockwise through the year.
    ax.set_theta_zero_location("N")
    ax.set_theta_direction(-1)

    bar_width = 2 * math.pi / 365

    ax.bar(
        radial_angles,
        radial_values,
        width=bar_width,
        bottom=1.0
    )

    ax.set_title("Hong Kong Lightning Calendar — 2025")
    ax.set_yticklabels([])

    fig.tight_layout()

    OUT.mkdir(exist_ok=True)
    fig.savefig(OUT / PICTURE, dpi=150)

    print(f"saved out/{PICTURE}")

    plt.show()


if __name__ == "__main__":
    main()