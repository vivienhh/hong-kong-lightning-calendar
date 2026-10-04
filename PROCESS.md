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

### First nested particle sphere test

After confirming that the MapLibre map and Three.js temporal object could work together, I replaced the stacked annual torus structure with a first nested particle-based prototype.

The new prototype uses the original daily lightning dataset to build a deeper temporal hierarchy. Each year contains twelve monthly systems, while each month is associated with its recorded daily values. The intention was to move away from large solid annual rings and toward a more volumetric, continuously moving field made from smaller temporal units.

This experiment successfully changed the overall form from a vertical stack into a more spherical three-dimensional object. It also confirmed that the browser could animate multiple year systems and daily instances while preserving the existing 360-degree camera interaction and Hong Kong map.

However, the first visual test revealed several important problems.

#### 1. The temporal sphere is too large

The current sphere is large enough to surround most of Hong Kong. This makes the map appear to sit inside a data cage or shell.

This is not the intended relationship.

The Hong Kong map should remain the geographic base, while the temporal sphere should appear as a smaller independent data sculpture floating above the centre of Hong Kong.

In the next iteration, the sphere should be reduced substantially in scale, approximately to around one third of the main visible width of Hong Kong, and positioned higher above the map plane.

From the top view it should initially appear as a concentrated luminous area above Hong Kong. When the camera angle is lowered, its three-dimensional volume should become visible.

#### 2. Structural orbit lines are too visible

The current prototype displays many year and month orbit lines. These were useful while testing the structure, but visually they dominate the object and make the sphere look like a wire cage.

The visible lines are therefore functioning more like construction guides than part of the intended final visual language.

The final system should not explicitly draw the paths that organise the data.

Instead, the temporal hierarchy should be perceived from the arrangement of the light elements themselves.

In other words:

- a year should not be represented by one visible large orbit line;
- a year should be formed by twelve monthly light rings;
- a month should not need a visible supporting orbit;
- a month should be formed by approximately 28–31 daily light units.

The invisible orbital structure can still be used mathematically to position and animate the elements, but it should not appear as a dominant visual object.

#### 3. The nested hierarchy is not yet visually readable

The conceptual hierarchy is:

Temporal sphere
→ years
→ 12 months per year
→ 28–31 days per month.

However, in the current prototype this hierarchy is still difficult to perceive visually.

The next version should make the nesting itself become the visible form.

A single year should appear as a system of twelve luminous monthly rings arranged around an invisible circular path.

Each monthly ring should then be constructed from its daily values. The daily units should behave like small luminous rings or cells arranged around the month.

Therefore:

22 year systems
→ each formed from 12 month rings

12 month rings
→ each formed from 28–31 daily light cells

Daily light cell
→ one real recorded daily lightning count.

The supporting geometry should disappear, leaving only the nested light structures.

#### 4. Daily motion currently exists but is visually difficult to perceive

The current implementation already animates daily instances, but the movement is difficult to recognise because the sphere is too large, the individual elements are too subtle, and the visible structural lines dominate the composition.

The next motion system should make the orbital behaviour clearer without becoming chaotic.

The intended motion is hierarchical:

- the complete temporal sphere rotates very slowly;
- individual year systems have slightly different orientations and slow precession;
- monthly systems rotate around their annual structure;
- daily light cells move around their monthly rings;
- strong lightning days remain brighter and more visually prominent than quiet days.

The animation should create the impression of a living orbital system rather than a random particle explosion.

Importantly, animation must not change the underlying data relationship. A day with zero or very low lightning activity should never become visually stronger than a genuinely active day simply because of animation.

#### 5. The map and sphere need a clearer spatial relationship

The current sphere visually competes with and encloses the Hong Kong map.

The intended composition is instead:

Temporal data sphere
floating above

↓

Hong Kong map
as geographic stage.

The map answers “where”.

The temporal sphere answers “when” and “how much”.

The next iteration should therefore create clearer vertical separation between the two objects and allow the user to understand the sphere as something suspended above Hong Kong rather than wrapped around it.

#### Revised visual direction

The current test suggests that the final global view should not be built from visible orbital lines.

Instead, it should be built from nested luminous units:

Daily micro-rings
→ form monthly rings

Monthly rings
→ form annual systems

Annual systems
→ collectively form the temporal sphere.

The resulting sphere should feel particle-like, luminous, orbital, and continuously moving. Its spherical appearance should emerge from the distribution and motion of the temporal elements rather than from a large visible spherical boundary or wire structure.

The next prototype will therefore focus on:

1. reducing the overall sphere scale;
2. lifting it above the Hong Kong map;
3. removing visible year and month construction lines;
4. making the twelve monthly rings the visible structure of each year;
5. constructing each monthly ring from daily luminous units;
6. making nested orbital motion visually clearer;
7. preserving lightweight rendering so that the full daily dataset remains interactive.


### Evaluating the full orbital hierarchy prototype

After the earlier nested particle experiments, I attempted to construct the complete temporal hierarchy in one view:

- 22 annual orbital systems for 2005–2026;
- 12 monthly systems attached to each annual orbit;
- 28–31 concentric daily rings inside each monthly system.

The intended hierarchy was:

Year
→ Month
→ Day

Each annual orbit represented one year of Hong Kong lightning data. Twelve monthly systems were positioned along each annual orbit, while each month contained concentric daily rings ordered from the centre outward from Day 01 to the final day of the month.

The prototype also introduced continuous motion: annual systems rotated in three-dimensional space, monthly systems circulated around their parent year, and animated highlights moved around the daily rings.

#### What worked

The experiment confirmed that the complete Year → Month → Day hierarchy could be represented programmatically.

The browser was able to construct:

- 22 year systems;
- 264 month systems;
- all 7,742 recorded daily values.

It also confirmed that hierarchical transformations could work correctly. A month could remain attached to its parent year while the year itself rotated, which is important for the later interactive structure.

The experiment therefore validated the basic parent-child motion model.

#### What did not work visually

Although the hierarchy was technically present, the complete composition became visually overexposed and difficult to read.

The main problem was the use of a transparent shader plane for every month. With 264 month planes occupying a relatively small three-dimensional volume, many transparent surfaces overlapped from the camera view.

Each monthly plane also contained up to 31 luminous daily rings. When hundreds of these transparent surfaces overlapped, their brightness accumulated and large areas became almost completely white.

Instead of seeing:

22 year orbits
→ 12 month systems
→ daily rings,

the viewer mainly perceived a bright solid mass.

This contradicted the intended visual reference, where the spherical form should emerge from open orbital structures, light trails, and negative space rather than from a filled or solid sphere.

#### Important design lesson

The experiment showed that the complete hierarchy should not be implemented all at once before the motion language of each level has been resolved.

The visual hierarchy needs to be developed incrementally.

A better development sequence is:

1. design one annual orbit;
2. attach twelve monthly rings and test their motion;
3. duplicate the successful annual system into 22 years;
4. only after the multi-year structure works, introduce the daily concentric rings;
5. add the Hong Kong map and interface composition last.

This allows each spatial relationship to be evaluated independently.

#### Revised direction

The project was therefore reduced to a Single-Year Orbital Skeleton prototype.

For this stage, the Hong Kong map, daily rings, 22-year structure, and lightning magnitude encoding were temporarily removed.

The prototype only tests:

- one large Year orbit;
- twelve Month rings;
- continuous three-dimensional Year rotation;
- twelve Month centres circulating along the Year orbit;
- independent light movement around each Month ring.

This simpler prototype makes it possible to evaluate the orbital motion itself before multiplying the system across the complete dataset.

The next step is to preserve the successful single-Year structure and investigate how 22 real annual systems can be combined into one kinetic multi-orbit composition, inspired by layered generative geometry rather than a solid spherical shell.


### From orbital day beads to concentric month ripples

After establishing the Single-Year Orbital Skeleton, I began testing how daily lightning values could be represented inside each month.

#### First attempt: daily rings orbiting around a monthly path

The first approach treated each month as a medium-sized circular orbit.

Each recorded day was then represented as an individual small ring positioned along that monthly orbit.

For the 2025 test year, this produced:

- 1 annual luminous orbit;
- 12 monthly carrier paths;
- 365 individual daily rings.

The daily rings used real 2025 Hong Kong Observatory lightning counts. Lightning magnitude controlled the brightness, line thickness, and glow of each daily ring.

The daily rings also circulated around their monthly path, and a small moving marker was introduced to make their local clockwise rotation visible.

#### What worked

This prototype successfully demonstrated the full spatial hierarchy:

Year
→ Month
→ Day

It also confirmed that all 365 daily records from 2025 could be rendered and animated while remaining attached to the correct month.

The annual light-flow effect worked well and was retained as the visual language for the Year level.

#### What did not work

The daily rings were initially too small.

When 28–31 small rings were distributed around each monthly orbit, they appeared fragmented and visually similar to beads or small mechanical parts.

Increasing their size improved their visibility, but revealed a more fundamental problem: the structure itself did not match the intended temporal hierarchy.

The resulting composition communicated:

Month orbit
→ many small objects travelling around it,

rather than:

Month
→ a temporal structure composed of its days.

This made the daily data feel decorative rather than structurally meaningful.

The visible Year and Month carrier lines also added unnecessary geometry. The paths were useful computationally, but they did not need to remain visible in the final visual language.

#### Revised interpretation of the month

I therefore changed the relationship between Month and Day.

Instead of placing 28–31 small rings around a monthly orbit, the entire Month is now represented as one concentric ripple system.

Each daily value becomes one concentric ring:

- Day 01 = innermost ring;
- subsequent dates move progressively outward;
- the final day of the month = outermost ring.

This creates a much clearer temporal ordering because the geometry itself directly represents the sequence of days.

Lightning magnitude continues to control:

- ring brightness;
- ring thickness;
- glow intensity.

Zero- or low-lightning days remain visible but faint, while high-lightning days become brighter and more prominent.

#### Processing-inspired ripple motion

The monthly concentric system was animated using a motion principle inspired by a Processing reference in which rings receive different vertical phase offsets.

Instead of moving around the month, each daily ring remains concentric but oscillates slightly along its local Z axis.

Conceptually:

z = sin(time + day phase) × amplitude

Because each day has a different phase, the complete month continuously changes from a flat circular structure into a ripple, bowl, or wave-like form.

The chronological order of the days never changes.

This gives the Month system a dynamic quality while preserving the underlying data structure.

#### Current successful structure

The 2025 prototype now consists of:

Year
→ one luminous moving annual orbit

Month
→ twelve concentric ripple modules positioned around the annual orbit

Day
→ 28–31 concentric rings inside each Month module

The 2025 test contains all 365 daily records.

This version is much closer to the intended visual language because temporal hierarchy is now embedded directly into the geometry rather than added as decorative orbiting objects.

The next step is to refine the scale, ripple amplitude, motion speed, and overall visual balance of the Month modules before extending the successful single-year system to all 22 years from 2005 to 2026.


### Refining the 2025 concentric month ripple system

After confirming the concentric Month → Day structure, I refined the visual scale and luminous quality of the 2025 prototype.

The underlying hierarchy remained unchanged:

Year
→ 12 Month ripple systems
→ 28–31 concentric Daily rings per month.

Each daily ring still represents one date, ordered from the centre outward:

Day 01
→ innermost ring

Final day of the month
→ outermost ring

Lightning magnitude continues to control ring brightness, thickness, and glow.

#### Refining the Month scale

In the first concentric ripple prototype, the Month systems were structurally clear but appeared slightly too small relative to the annual orbit.

I therefore increased the overall Month radius while keeping the Year orbit unchanged.

This made the Month systems more visually significant and helped the 28–31 daily rings read as one coherent temporal module rather than a small decorative detail.

#### Refining line weight and light diffusion

The Daily rings were also slightly too delicate.

Their line thickness was increased while preserving the difference between weak and strong lightning days.

The glow system was expanded using multiple luminous layers:

- a brighter core data ring;
- a wider translucent halo;
- an additional soft outer halo for stronger lightning days.

This produces a softer diffusion of light around high-activity dates without turning the complete Month system into a solid white shape.

The intention is that strong lightning days feel energetic and luminous, while low-activity days remain thin and quiet.

#### Current 2025 module

The current 2025 prototype now contains:

- one luminous annual orbit;
- twelve enlarged Month ripple systems;
- 365 real daily lightning records;
- Processing-inspired ripple motion;
- data-driven ring thickness, brightness, and glow.

At this stage, the single-year module is visually stable enough to test at the next scale.

Rather than continuing to optimise one year in isolation, the next experiment will combine the complete 2005–2026 dataset.

### Next direction: 22-year kinetic composition

The next prototype will investigate how 22 annual systems can coexist in one three-dimensional composition.

A generative geometry reference from OpenProcessing suggests a useful spatial direction: multiple circular systems can share a common centre while using different radii, orientations, phases, and rotation speeds.

The goal is not to reproduce the reference literally, but to adapt its layered kinetic geometry to the temporal structure of the Hong Kong lightning dataset.

Each visible annual system will correspond to one real year from 2005 to 2026.

The current Year → Month → Day structure will remain intact inside every year:

Year
→ twelve Month ripple systems
→ daily concentric rings.

The 22 annual systems will then be arranged as a layered kinetic temporal field rather than as a solid sphere.

The main questions for the next prototype are:

- how much annual radius should change across 2005–2026;
- how the 22 annual planes should be tilted and rotated;
- how different rotation speeds can create a coherent kinetic structure;
- how much glow should remain visible when all years overlap;
- whether the complete composition still preserves enough negative space to remain readable.

The Hong Kong map will remain temporarily excluded until the 22-year temporal structure is visually resolved.


### Isolating the 22-year carrier-ring motion

After several attempts to combine all Year → Month → Day structures at once, I found that the complexity of the month and day systems made it difficult to evaluate whether the year-level spatial structure itself was working.

I therefore temporarily removed the Month systems, Daily rings, strong glow effects, and the Hong Kong map, and built a minimal 22-year carrier-ring prototype.

In this version:

- all 22 Year rings share exactly the same centre;
- 2005 is the innermost and smallest ring;
- the radius increases chronologically until 2026, which is the outermost ring;
- each Year has a different initial Y-axis rotation phase;
- each Year rotates around the Y axis at a slightly different speed;
- the complete motif also rotates slowly around the Y axis;
- an orthographic camera is used to create a flatter, diagrammatic, armillary-sphere-like appearance.

This structure was adapted from the motion logic of an OpenProcessing reference in which multiple circular elements share the same origin but have different radii, initial Y rotations, and Y-axis rotation speeds.

The simplified test was much more successful than the earlier full hierarchy experiments. The 22 rings now remain spatially coherent and form a nested kinetic structure rather than dispersing into a cloud of independent objects.

The next step is to keep this carrier-ring motion unchanged and replace only the 2025 carrier ring with the complete 2025 Year module. This will test whether the existing Year → Month → Day visualisation can be embedded inside the successful carrier-ring motion system without changing the internal month and day design.


### Integrating the 2025 module into the 22-year carrier system

After confirming the 22-year carrier-ring motion, I reintroduced the complete 2025 Year → Month → Day module into the larger structure. The first integration showed that the original Month ripple systems were too large for future multi-year stacking, so I reduced each Month system while keeping its position, Daily-ring structure, and ripple motion unchanged.

I also tested several alternatives for the Year-level light, including denser particles and continuous glow rings. These versions made the orbit more continuous, but they lost the soft clustered light quality of the earlier 2025 prototype. I therefore returned to the original Prototype 03.1 Year-light shader and used it as the visual reference.

To reduce visible gaps without making the light blobs too large, I increased the particle density, reduced the random phase offset, raised the minimum brightness, and slightly reduced the point size. This produced a more continuous but still uneven and luminous Year orbit.

The earlier standalone 2025 prototype is still preserved separately as a reference. This iteration confirmed that the next step should be to test multiple complete Year modules gradually rather than expanding all 22 years at once.


### Encoding annual lightning intensity across 2020–2026

I expanded the complete Year → Month → Day hierarchy from a single 2025 prototype to seven years of real Hong Kong Observatory lightning data from 2020 to 2026.

Displaying several complete Year modules together made the Month systems visually dominant, so I reduced their scale to 60% of the previous size and slightly lowered the brightness of the Daily rings and halos. This kept the Month and Day structures readable without overwhelming the Year-level composition.

I then mapped each year's total lightning count to the visual appearance of its Year orbit. The chronological radius remains fixed, with earlier years inside and later years outside, while annual lightning intensity controls the orbit's thickness, brightness, and colour. Years with higher total lightning become thicker, brighter, and slightly more violet-white, while lower totals remain thinner, dimmer, and more cyan-blue.

I used a logarithmic normalisation for annual totals so that extreme values would not visually overpower the other years. The strongest year is capped at the previously tested maximum visual intensity. The 2026 module uses only the available partial-year observations rather than extrapolating missing future dates.

This iteration establishes a clearer data hierarchy: radius represents time, the Year orbit represents annual intensity, and the concentric Daily rings represent day-level lightning activity.


### Testing the complete 2005–2026 hierarchy

I expanded the full Year → Month → Day structure to all 22 years from 2005 to 2026. Although the complete dataset could be rendered successfully, displaying all monthly and daily structures simultaneously caused severe visual overlap and additive-light overexposure. The central region became difficult to read, and differences between individual years were obscured.

This test showed that simply reducing brightness would not solve the underlying information-density problem. I therefore decided to keep the detailed Month and Day structures for selected-year views, while redesigning the overview as a compressed yearly rhythm. In the next iteration, each Year orbit will retain annual and monthly variation directly on the ring, using colour, thickness, brightness, and local rhythm rather than displaying every Daily ring at once.


### Establishing the compressed Year-rhythm overview

After testing all 22 complete Year → Month → Day modules simultaneously, I found that the large number of overlapping Daily rings and additive light effects made the visualisation difficult to read. Instead of simply reducing opacity, I compressed the lower-level temporal variation into each Year orbit.

In the current overview, chronological order is represented by radius, annual lightning totals influence overall thickness and brightness, and monthly lightning totals create local changes in the flowing light around each orbit. Strong Daily events are retained as sparse peak highlights.

I also refined the visual language from solid particles into softer flowing light clusters with controlled diffusion. The colour system was adjusted toward layered gold, lemon yellow, champagne and yellow-white tones, with a small number of icy blue and lavender accents to preserve separation between overlapping years.

This version is treated as the initial visual baseline for the 2005–2026 overview before adding interactive Year selection and Month/Day unfolding.