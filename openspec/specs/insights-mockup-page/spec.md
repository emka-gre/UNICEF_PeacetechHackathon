# insights-mockup-page Specification

## Purpose

Gives UNICEF and Laaha analysts a one-page briefing of the synthetic Poland dataset, showing trends, where and how harm happens, and alerts for emerging patterns, with the dataset available to download for further research.

## Requirements

### Requirement: Standalone page
The page SHALL run on its own, separately from the existing Laaha app. It SHALL NOT need the app's server, login or build, and SHALL work offline once the dataset has been generated.

#### Scenario: Open without the app
- **WHEN** the dataset has been generated and the page is opened while the Laaha app is not running
- **THEN** the page loads and shows all sections

#### Scenario: Dataset missing
- **WHEN** the page is opened before the generator has been run
- **THEN** it says how to generate the dataset instead of showing empty charts

### Requirement: Synthetic label
The page SHALL show, at all times and in a visible place, that it displays synthetic demo data about a fictional scenario.

#### Scenario: Label visible
- **WHEN** the page is scrolled to any section
- **THEN** a "Synthetic demo data" label remains visible

### Requirement: Headline figures and filters
The page SHALL show total reports, change against the previous period, share of verified reports and number of active alerts. The analyst SHALL be able to filter every section by region and by mode (online, in person, or both).

#### Scenario: Filter by region
- **WHEN** the analyst chooses Podkarpackie
- **THEN** the headline figures, charts and alerts show only reports from Podkarpackie

### Requirement: Trend over time
The page SHALL show weekly report counts for the full period, split by narrative, with a simple trend line.

#### Scenario: Spike visible
- **WHEN** no filter is applied
- **THEN** the planted "abusing benefits" spike is visible in the weekly chart

### Requirement: Where and how
The page SHALL show a category by platform heatmap for online reports, a breakdown by voivodeship, and a breakdown by target type and age band.

#### Scenario: Heatmap
- **WHEN** the analyst looks at the heatmap
- **THEN** each cell shows the number of online reports for that category and platform

### Requirement: Alerts derived from the data
The page SHALL compute alerts from the dataset itself, not from the ground-truth file or fixed text. It SHALL detect: a narrative whose weekly count reaches at least three times its trailing average for at least two weeks (so a single noisy week is not an alert); a link cluster with at least 20 reports within 72 hours; and a voivodeship where online lure reports are followed three to four weeks later by a rise in in-person reports. Each alert SHALL state, in one sentence, what changed, where, when and how many reports it covers.

#### Scenario: Planted patterns found
- **WHEN** the page is opened with the default dataset and no filters
- **THEN** it shows an alert for each of the three planted patterns

#### Scenario: Alerts follow filters
- **WHEN** the analyst filters to a voivodeship where no planted pattern occurred
- **THEN** alerts for the other voivodeships are not shown

### Requirement: Online to offline view
The page SHALL show, for the selected region, weekly online lure reports next to weekly in-person reports so the delay between them can be seen.

#### Scenario: Lag visible
- **WHEN** the analyst selects Lubelskie
- **THEN** the chart shows lure reports rising before in-person reports

### Requirement: Dataset download
The page SHALL offer the CSV, the JSON and the data card for download, with a short note that the files are synthetic and that pattern labels are in a separate ground-truth file.

#### Scenario: Download CSV
- **WHEN** the analyst chooses to download the CSV
- **THEN** the full synthetic dataset CSV is saved

### Requirement: Aggregate view only
The page SHALL show counts, trends and patterns only. It SHALL NOT show individual risk scores or predictions about individual women.

#### Scenario: No individual scoring
- **WHEN** the page is reviewed
- **THEN** no section ranks or scores individual reports or people by risk
