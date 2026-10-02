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