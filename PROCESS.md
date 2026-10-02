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