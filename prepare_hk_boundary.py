# /// script
# requires-python = ">=3.10"
# dependencies = ["osmnx", "geopandas"]
# ///

"""
Download a detailed Hong Kong boundary from OpenStreetMap.

Run:
uv run prepare_hk_boundary.py
"""

from pathlib import Path

import osmnx as ox


HERE = Path(__file__).parent
SITE_DATA = HERE / "site" / "data"

OUT = SITE_DATA / "hong-kong-boundary-precise.geojson"


def main():
    SITE_DATA.mkdir(
        parents=True,
        exist_ok=True,
    )

    print("downloading precise Hong Kong boundary...")

    hong_kong = ox.geocoder.geocode_to_gdf(
        "R913110",
        by_osmid=True,
    )

    # Keep only geometry for a clean web file.
    hong_kong = hong_kong[
        ["geometry"]
    ].copy()

    hong_kong.to_file(
        OUT,
        driver="GeoJSON",
    )

    print(f"saved {OUT}")
    print(
        f"geometry type: "
        f"{hong_kong.geometry.iloc[0].geom_type}"
    )


if __name__ == "__main__":
    main()