# Process

## Tools used

I used VS Code to edit the project, Git and GitHub to record the development process, and Python with Matplotlib to read and visualise the data.

I also used ChatGPT as an AI assistant during the project. It helped me understand Python syntax, debug errors, explain transformations, compare visualisation ideas, and plan the development process step by step. I did not simply accept every suggestion. I tested the code locally, checked the output, and decided which visual approaches to keep or reject based on what the data actually showed.

## Data and early exploration

I chose the Hong Kong Observatory daily cloud-to-ground lightning dataset. I first modified the assignment template so that `fetch.py` downloaded and saved the raw lightning CSV file into `data/`.

Before making a visualisation, I printed the first row, inspected one lightning value, checked its data type, and converted the value from a string to a float.

My first visualisation was a simple plot of the daily lightning counts. After that, I created a year-by-day heatmap to explore the longer time span from 2005 to 2026.

## One thing I kept

I kept the logarithmic transformation:

`log(1 + daily lightning count)`

The raw values range from 0 to 14,600. When I used the original linear values, a small number of extreme lightning days dominated the colour scale and made most moderate lightning activity difficult to see.

Using the logarithmic transformation revealed more of the seasonal pattern while still preserving the difference between quiet and active days.

I later reused the same transformation in the radial calendar prototype.

## One thing I rejected

I rejected the raw linear heatmap as the final visual direction.

Although it represented the original values directly, most of the picture appeared visually flat because the extreme values controlled the scale. It was useful as an exploration step, but it did not reveal the everyday rhythm of the data clearly enough.

I also considered placing lightning directly on a map of Hong Kong. I did not use this approach because the dataset contains a daily total for Hong Kong territory rather than the geographic coordinates of individual lightning events. Showing invented lightning locations would suggest spatial information that the source data does not contain.

## Developing the radial calendar

I then tested a radial calendar using 2025 as a prototype year.

The day of the year is transformed into an angle around a circle, and the logarithmic lightning count becomes the radial bar length. I also adjusted the calculation for leap years so that both 365-day and 366-day years can be represented correctly.

This prototype helped me explore a visual form that reflects the repeating annual rhythm of lightning activity.

The next stage of the project is to develop the final visualisation and an interactive version that allows users to explore different years while keeping the relationship between the original data and the visual transformation clear.

### Coastline-based lightning prototype

I first mapped the daily lightning data as vertical data columns distributed along the edges of Hong Kong's land areas. This created a visually striking effect and connected the data closely with the geographic form of Hong Kong. However, because the coastline and land boundaries are highly fragmented, the overall timeline became difficult to read clearly. It was also hard to compare changes in lightning activity across the year.

Based on this test, I decided to separate the geographic background from the temporal encoding. Hong Kong will remain as the central geographic context, while the daily lightning data will instead be arranged along a continuous halo surrounding the map. The vertical bars will then show differences in lightning intensity across the year, making both the temporal progression and changes in daily values easier to compare.

### 365-layer temporal stack prototype

After testing the calendar halo, I explored a different structure that connected the temporal data more closely with the geographic form of Hong Kong. Instead of placing the days around an external ring, I treated each day as one copy of Hong Kong's land outline. In the overview state, the daily contours overlap, while clicking Hong Kong shifts the map into a 2.5D view and separates the layers vertically from January at the bottom to December at the top. Daily lightning intensity is represented through the brightness and line weight of each contour, using a logarithmic scale so that extreme lightning days do not visually overwhelm the rest of the year.

This experiment created a strong three-dimensional data landscape, but testing also revealed two problems. First, the 365 layers were still too visually dense, making individual days and differences between months difficult to distinguish. Second, repeatedly rendering hundreds of complex Hong Kong outlines and glow effects made the interaction noticeably slow. For the next iteration, I plan to introduce a clearer month-to-day hierarchy, stronger differentiation between active and zero-lightning days, and a more efficient rendering structure that reuses the Hong Kong geometry instead of repeatedly rebuilding it.

### Month–day stack and performance experiment

In the next iteration, I kept the idea of using Hong Kong's outline as the basic visual unit, but introduced a clearer month-to-day hierarchy and also tested several performance optimisations. The Hong Kong coastline was stored once and reused through SVG references instead of rebuilding the full geometry for every day. I also reduced redraws during map movement, made zero-lightning days almost invisible, added stronger monthly summary contours, and limited expensive glow effects to the strongest lightning days.

Although this approach improved the structure of the visualisation conceptually, the browser test revealed several visual problems. Because Hong Kong's coastline contains many fragmented and detailed land edges, repeating the complete outline across many daily layers created dense vertical walls and tower-like forms. The overall shape became visually dramatic, but the geographic form of Hong Kong was difficult to recognise clearly.

The distinction between individual days and months was also still not strong enough. Even with larger month gaps and monthly summary contours, the repeated full-size Hong Kong outlines overlapped heavily, making the year appear as a continuous luminous mass. This made it difficult to compare lightning intensity between individual days and to perceive the broader seasonal pattern across the year.

The colour and glow treatment also became too visually dominant. Because many active layers overlapped, the blue, lavender, pink, and gold gradients accumulated into a bright pastel surface, reducing the contrast between ordinary days and extreme lightning events. The floating base below the map also became visually heavy and competed with the data layers instead of supporting them.

This iteration therefore showed that the main problem was not only performance, but also the visual granularity of the geographic geometry itself. Before continuing, I need to reconsider how much geographic detail should be repeated in the temporal stack. Possible next steps include simplifying the Hong Kong contour, strengthening the separation between month-level and day-level information, reducing colour and glow, and making the floating geographic base lighter and less dominant.

### From stacked annual rings to a nested particle temporal sphere

After the earlier month–day stack experiments, I reconsidered the visual structure of the project from the data hierarchy itself. The lightning dataset is fundamentally temporal. It contains daily cloud-to-ground lightning counts across Hong Kong from 2005 to 2026, which can naturally be read at three nested scales: year, month, and day. Rather than forcing the data into repeated geographic outlines, I decided to make time itself the main organising structure.

The new concept is based on light as the primary visual metaphor. Because lightning is itself a visible burst of light, the recorded lightning count can be translated into brightness, line weight, glow, and diffusion. Time determines the position and order of the visual elements, while lightning activity determines how strongly those elements appear.

#### Data hierarchy

The visualisation now follows a nested temporal structure:

- 2005–2026 forms the complete visual timeline of 22 annual systems.
- 2005 is a partial year because the dataset begins on 21 June.
- 2006–2025 are complete calendar years.
- 2026 is an incomplete / year-to-date year.
- Each year contains 12 monthly systems.
- Each month contains 28–31 daily data units.
- Each daily unit corresponds directly to one recorded lightning count in the original dataset.

This means that the final temporal structure can ultimately be built from the same 7,742 daily records contained in the original CSV rather than from decorative or invented particles.

#### Reintroducing Hong Kong as the spatial context

I decided to keep the Hong Kong map developed in the earlier prototypes, but change its role.

Instead of using the geography itself to encode daily lightning values, the Hong Kong map now becomes the spatial stage or geographic anchor of the experience. The temporal data exists as a separate three-dimensional light structure suspended above the map.

In the initial view, the user sees Hong Kong from almost directly above. From this perspective, the temporal structure appears as a concentrated luminous area above the territory. The intention is that the user initially perceives one accumulated field of light rather than immediately seeing the internal data hierarchy.

When the user drags and lowers the viewing angle, the Hong Kong map becomes a horizontal plane and the light structure is revealed as a three-dimensional temporal object floating above it. This creates a perspective-based reveal: what first appeared to be a flat glow is actually a volume made from many years of lightning records.

The map therefore answers the question of “where”, while the temporal light structure answers “when” and “how much”.

#### First Three.js temporal sphere prototype

To test this spatial interaction, I built a first Three.js prototype on top of the existing MapLibre map.

The prototype contains 22 annual rings representing 2005–2026. The rings are arranged vertically and can be viewed from different angles. Users can drag horizontally to rotate around the structure, lower the camera angle to reveal the depth of the annual layers, zoom with the scroll wheel, hover over annual rings, and click a year to inspect its total lightning count, active days, and peak day.

This prototype successfully demonstrated several technical possibilities:

- Three.js can be layered above the existing MapLibre Hong Kong map.
- The data object and the geographic map can respond together to the same camera interaction.
- The user can rotate around the temporal object and inspect it from different perspectives.
- Annual data can be calculated directly from the committed daily CSV.
- Partial years such as 2005 and 2026 can be represented differently from complete years.
- A progressive Year → Month → Day interaction is technically feasible.

However, the visual result also revealed an important problem. Because every year was represented as one complete torus and the 22 torus rings were stacked vertically, the object appeared more like a glowing cylinder, spring, or stack of horizontal hoops than a volumetric field of lightning. The rings were too geometrically regular and too visually dominant. The result did not match the more energetic, particle-based and spatially complex character I wanted from the visual references.

This test showed that the problem is no longer the map or the 3D interaction itself. The main issue is the geometry used to construct the temporal object.

#### New visual direction: Nested Particle Temporal Sphere

The next direction is to replace the large stacked torus rings with a nested particle-based temporal structure.

The temporal sphere will still contain the complete 2005–2026 hierarchy, but a year will no longer appear as one large solid ring. Instead, each annual system will be composed of its twelve monthly systems, and each monthly system will in turn be composed of approximately 28–31 daily light units.

Conceptually:

Year
→ 12 monthly orbital systems

Month
→ 28–31 daily light units

Day
→ one real lightning count

This creates a recursive visual system in which the same idea of light and orbit is repeated at different temporal scales.

From a distance, the thousands of smaller elements should collectively form a luminous volumetric sphere. The outer boundary does not need to be a perfect geometric sphere. Instead, the spherical form should emerge naturally from multiple rotating orbital structures, particles, rings, and areas of varying brightness.

As the viewer moves closer or selects a year, the internal organisation becomes clearer. A selected year can separate from the larger temporal field and reveal its twelve months. Selecting one month can then expand it into a set of daily concentric or orbital rings.

#### Motion as part of the temporal structure

The new temporal sphere should remain continuously alive rather than appearing as a static chart.

The whole sphere can rotate very slowly as one global system. Individual annual systems can have slightly different orientations and subtle independent movement. Within each year, the twelve monthly systems can rotate slowly around their own orbital arrangement. Daily light units can also contain small amounts of movement or pulsing.

The motion should not randomly change the data values. The recorded lightning count remains the base value controlling the visual strength of each day. Animation should only create a subtle breathing or energy effect around that fixed value.

For example, a low-lightning day should remain visually weak, while an extreme lightning day can remain much brighter and produce a larger halo. Animation may slightly fluctuate this appearance, but it should not change the relative meaning of the data.

#### Visual encoding

The current visual language is:

Time
→ position, sequence, nesting, and orbital structure

Lightning count
→ brightness, line thickness, light intensity, and diffusion

Colour
→ temporal progression rather than lightning magnitude

This distinction is important because it prevents too many visual variables from representing the same quantity.

A quiet period should therefore appear sparse, thin, and dim, while a highly active period should naturally become denser, brighter, and more visually energetic.

At the monthly level, this may create different visual densities. A month containing many active lightning days may appear almost solid and luminous because many daily units are visible. A month containing only a few active days may appear much more sparse, with large visual gaps between the strongest daily signals.

#### Performance strategy

A direct implementation using thousands of individual complex Three.js torus meshes would likely become too expensive to render. The earlier SVG experiments already showed that repeating complex geometry many hundreds of times could produce noticeable performance problems.

The next prototype should therefore use progressive levels of detail.

At the global view:

- 22 year systems are visible.
- Month and day structures should be represented with lightweight particles, points, instanced geometry, or shared materials.
- The complete dataset can contribute to the appearance of the sphere without creating thousands of independent heavy meshes.

When a year is selected:

- the other annual systems can fade;
- the selected year can reveal its 12 monthly systems in greater detail.

When a month is selected:

- only that month needs to render its 28–31 daily units using more detailed ring geometry.

This allows the interface to preserve the full Year → Month → Day hierarchy while avoiding the performance problems of rendering every daily ring at maximum detail simultaneously.

#### Current interaction concept

The intended experience is now:

Top view
→ Hong Kong appears as a luminous geographic base
→ multiple years visually overlap into one concentrated field of light

Drag / rotate
→ the map becomes a horizontal spatial plane
→ the light field reveals itself as a three-dimensional temporal sphere
→ the viewer can orbit around the object

Inspect a year
→ the selected annual system becomes prominent
→ other years fade
→ annual statistics become visible

Open a year
→ the annual system reveals twelve monthly orbital structures

Open a month
→ the month expands into 28–31 daily light rings or light cells

Inspect a day
→ exact date and daily lightning count are revealed

This means the user is not switching between unrelated charts. Instead, the interaction behaves like moving deeper into the same temporal object.

#### Design intention

The project is therefore evolving from a conventional data visualisation into a nested temporal data sculpture.

Hong Kong is the geographic stage.

The temporal sphere represents accumulated lightning through time.

Years, months, and days are nested within one another.

The same visual language of light is maintained across all three scales.

The key idea can currently be summarised as:

> A year is a light made from twelve months.  
> A month is a light made from its days.  
> Twenty-two years accumulate above Hong Kong as a moving temporal field of lightning.

The next step is to replace the current stacked annual torus prototype with a lightweight nested particle architecture while preserving the working map, camera interaction, annual data processing, and 360-degree viewing controls.