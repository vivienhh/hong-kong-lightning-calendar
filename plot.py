# /// script
# requires-python = ">=3.10"
# dependencies = ["matplotlib"]
# ///

"""
Read the lightning file in data/, inspect the values, make one picture,
and save it to out/.

Run:
uv run plot.py
"""

import csv
from pathlib import Path

import matplotlib.pyplot as plt

FILE = "daily_HK_LGTG_ALL.csv"
PICTURE = "lightning-first-plot.png"

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
    print(f"first lightning value: {table[0][3]}")
    print(f"type before conversion: {type(table[0][3])}")

    days = []
    values = []

    for i, (year, month, day, value, quality) in enumerate(table):
        if value == "***":
            continue

        days.append(i + 1)
        values.append(float(value))

    print(f"type after conversion: {type(values[0])}")
    print(f"{len(values)} values")
    print(f"minimum: {min(values)}")
    print(f"maximum: {max(values)}")

    fig, ax = plt.subplots(figsize=(12, 4))

    ax.plot(days, values, linewidth=1)

    ax.set_xlabel("day since records began")
    ax.set_ylabel("daily cloud-to-ground lightning count")
    ax.set_title("Hong Kong Daily Cloud-to-Ground Lightning")

    fig.tight_layout()

    OUT.mkdir(exist_ok=True)
    fig.savefig(OUT / PICTURE, dpi=150)

    print(f"saved out/{PICTURE}")

    plt.show()


if __name__ == "__main__":
    main()