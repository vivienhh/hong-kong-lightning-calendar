# /// script
# requires-python = ">=3.10"
# dependencies = ["osmnx", "geopandas", "shapely"]
# ///

"""
Prepare lightweight Hong Kong vector data for the interactive website.

Run:
uv run prepare_web_data.py
"""

import ast
from pathlib import Path

import geopandas as gpd
import osmnx as ox


HERE = Path(__file__).parent

ASSETS = HERE / "assets"
WEB_DATA = HERE / "site" / "data"

ROADS_FILE = ASSETS / "hong-kong-roads.graphml"
COAST_FILE = ASSETS / "hong-kong-coastline.geojson"

MAJOR_OUT = WEB_DATA / "hong-kong-roads-major.geojson"
LOCAL_OUT = WEB_DATA / "hong-kong-roads-local.geojson"
HIGHLIGHT_OUT = WEB_DATA / "hong-kong-roads-highlight.geojson"
COAST_OUT = WEB_DATA / "hong-kong-coastline.geojson"


# Main road network shown in white.
MAJOR_TYPES = {
    "motorway",
    "motorway_link",
    "trunk",
    "trunk_link",
    "primary",
    "primary_link",
    "secondary",
    "secondary_link",
    "tertiary",
    "tertiary_link",
}


# Only the strongest road hierarchy becomes cyan.
HIGHLIGHT_TYPES = {
    "motorway",
    "motorway_link",
    "trunk",
    "trunk_link",
    "primary",
    "primary_link",
}


# Fine background road texture.
LOCAL_TYPES = {
    "residential",
    "unclassified",
    "living_street",
    "service",
}


def highway_values(value):
    """
    Turn OSMnx highway values into a clean list of strings.

    GraphML can store a highway category either as:
    'primary'
    ['primary', 'secondary']
    or a string that looks like a Python list.
    """

    if value is None:
        return []

    if isinstance(value, (list, tuple, set)):
        result = []

        for item in value:
            result.extend(
                highway_values(item)
            )

        return result

    text = str(value).strip()

    if not text:
        return []

    # Handle strings such as:
    # "['primary', 'secondary']"
    if (
        text.startswith("[")
        and text.endswith("]")
    ):
        try:
            parsed = ast.literal_eval(text)

            return highway_values(parsed)

        except (
            ValueError,
            SyntaxError,
        ):
            pass

    # Occasionally multiple values may be
    # separated with semicolons.
    if ";" in text:
        return [
            item.strip()
            for item in text.split(";")
            if item.strip()
        ]

    return [text]


def highway_matches(
    value,
    allowed,
):
    """Return True if any highway type is in the allowed set."""

    values = highway_values(value)

    return any(
        item in allowed
        for item in values
    )


def simplify_for_web(
    gdf,
    metres,
):
    """
    Simplify geometry slightly so the
    browser can draw it more efficiently.
    """

    if gdf.empty:
        return gdf

    projected = gdf.to_crs(
        "EPSG:32650"
    )

    projected["geometry"] = (
        projected.geometry.simplify(
            metres,
            preserve_topology=True,
        )
    )

    return projected.to_crs(
        "EPSG:4326"
    )


def prepare_roads():
    print(
        "loading saved road network..."
    )

    graph = ox.io.load_graphml(
        ROADS_FILE
    )

    edges = (
        ox.convert.graph_to_gdfs(
            graph,
            nodes=False,
            fill_edge_geometry=True,
        )
        .reset_index()
    )

    print(
        f"original road edges: "
        f"{len(edges)}"
    )


    # -----------------------------
    # WHITE MAJOR ROADS
    # -----------------------------

    major = edges[
        edges["highway"].apply(
            lambda value:
                highway_matches(
                    value,
                    MAJOR_TYPES,
                )
        )
    ].copy()


    # -----------------------------
    # CYAN HIGHLIGHT ROADS
    # -----------------------------

    highlight = edges[
        edges["highway"].apply(
            lambda value:
                highway_matches(
                    value,
                    HIGHLIGHT_TYPES,
                )
        )
    ].copy()


    # -----------------------------
    # LOCAL ROAD TEXTURE
    # -----------------------------

    local = edges[
        edges["highway"].apply(
            lambda value:
                highway_matches(
                    value,
                    LOCAL_TYPES,
                )
        )
    ].copy()


    # -----------------------------
    # SIMPLIFY
    # -----------------------------

    major = simplify_for_web(
        major,
        metres=2,
    )

    highlight = simplify_for_web(
        highlight,
        metres=1.5,
    )

    local = simplify_for_web(
        local,
        metres=4,
    )


    # Keep highway because the browser
    # may still use it for styling later.

    major = major[
        [
            "highway",
            "geometry",
        ]
    ]

    highlight = highlight[
        [
            "highway",
            "geometry",
        ]
    ]

    local = local[
        [
            "highway",
            "geometry",
        ]
    ]


    # -----------------------------
    # SAVE
    # -----------------------------

    major.to_file(
        MAJOR_OUT,
        driver="GeoJSON",
    )

    highlight.to_file(
        HIGHLIGHT_OUT,
        driver="GeoJSON",
    )

    local.to_file(
        LOCAL_OUT,
        driver="GeoJSON",
    )


    print(
        f"major roads: "
        f"{len(major)}"
    )

    print(
        f"highlight roads: "
        f"{len(highlight)}"
    )

    print(
        f"local roads: "
        f"{len(local)}"
    )


def prepare_coastline():
    print(
        "preparing coastline..."
    )

    coastline = gpd.read_file(
        COAST_FILE
    )

    coastline = coastline[
        coastline.geometry.notna()
    ].copy()

    coastline = simplify_for_web(
        coastline,
        metres=2,
    )

    coastline = coastline[
        ["geometry"]
    ]

    coastline.to_file(
        COAST_OUT,
        driver="GeoJSON",
    )

    print(
        f"coastline features: "
        f"{len(coastline)}"
    )


def main():
    WEB_DATA.mkdir(
        parents=True,
        exist_ok=True,
    )

    prepare_roads()
    prepare_coastline()

    print()
    print("web data ready:")
    print(MAJOR_OUT)
    print(HIGHLIGHT_OUT)
    print(LOCAL_OUT)
    print(COAST_OUT)


if __name__ == "__main__":
    main()