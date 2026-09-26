# synthetic-report-dataset Specification

## Purpose

Produces a fictional but realistic dataset of reports about gendered misinformation and hypersexualisation targeting Ukrainian women in Poland, so analysts can explore patterns and researchers can build and test models without any real personal data.

## Requirements

### Requirement: Seeded, repeatable generation
The generator SHALL run with a single command, need no network access, no API key and no new dependencies, and SHALL produce identical output for the same seed. The seed SHALL default to a fixed value and SHALL be changeable from the command line.

#### Scenario: Same seed, same data
- **WHEN** the generator is run twice with the default seed
- **THEN** both runs produce byte-identical output files

#### Scenario: Different seed
- **WHEN** the generator is run with a different seed
- **THEN** it produces a different dataset with the same schema and the same planted patterns

### Requirement: Output files
The generator SHALL write, into the mockup's own data folder only, the dataset as CSV and as JSON, a ground-truth file that maps report ids to planted patterns, and a data card. It SHALL NOT read or write the existing app's data or code.

#### Scenario: Files written
- **WHEN** the generator finishes
- **THEN** the data folder contains the CSV, the JSON, the ground-truth file and the data card, and nothing outside the mockup folder has changed

### Requirement: Scenario and scope
The dataset SHALL contain between 2,000 and 3,000 reports dated from 1 October 2025 to 30 September 2026, set in Poland, where the targeted community is Ukrainian women (with an age band that includes girls aged 13 to 17). Location SHALL be given only at voivodeship level.

#### Scenario: Date and place range
- **WHEN** the dataset is inspected
- **THEN** every report date falls in the 12-month window and every region is one of Poland's 16 voivodeships

### Requirement: Dataset schema
Each report SHALL have: report id, date, ISO week, month, mode (online or in person), category, narrative, platform (online reports) or place (in-person reports), region, content language (PL, UA, RU or EN), target type, target age band, evidence type, moderation status, hours to review, a fictional link cluster id where a link was reported, and a paraphrased description. Categories SHALL include sexualised content or stereotypes and fake job, housing or relationship offers. Platforms SHALL include Telegram and classifieds sites. The CSV and JSON SHALL hold the same rows and columns, and the data card SHALL describe every column and its allowed values.

#### Scenario: Consistent formats
- **WHEN** the CSV and JSON are compared
- **THEN** they contain the same reports with the same values

#### Scenario: Mode-specific fields
- **WHEN** a report is in person
- **THEN** it has a place and no platform or link cluster, and when a report is online it has a platform and no place

### Requirement: Realistic background patterns
Outside the planted patterns, the data SHALL show a steady weekly volume with gradual growth over the year, regional weighting towards large host cities and the eastern border voivodeships, a plausible mix of categories per platform, and a status mix in which most reports are verified, recent reports are more often pending, and reports with thin evidence are more often rejected or marked as needing more information.

#### Scenario: Growth over the year
- **WHEN** weekly totals outside the planted patterns are compared between the first and last quarter
- **THEN** the last quarter has a higher weekly average

### Requirement: Planted patterns
The dataset SHALL contain three planted patterns, each recorded in the ground-truth file and described in the data card:
- **A. Narrative spike**: the "abusing benefits" narrative rises to at least three times its usual weekly volume for about four weeks, mainly on X and Facebook and concentrated in Mazowieckie, after a fictional benefits-policy debate.
- **B. Coordinated campaign**: 40 to 50 reports within 48 hours sharing 3 link clusters, about manipulated or stolen photos on fake dating profiles, mainly on TikTok and Instagram.
- **C. Lure ads, then offline harm**: fake job and housing offers on Telegram and classifieds sites, mostly in UA or RU, rise in Podkarpackie and Lubelskie in summer, and in-person reports of being followed or threatened rise in the same voivodeships three to four weeks later.

#### Scenario: Ground truth matches the data
- **WHEN** reports labelled with a pattern in the ground-truth file are counted by week, region, platform and link cluster
- **THEN** they show the spike, the 48-hour cluster and the regional lag described above

#### Scenario: Labels kept apart
- **WHEN** the dataset CSV is opened
- **THEN** it does not contain the pattern labels, so a model can be trained on it and scored against the ground-truth file

### Requirement: Safe, clearly synthetic content
Every output file SHALL state that the data is synthetic. Descriptions SHALL paraphrase what a post or incident contained and SHALL NOT contain slurs, explicit sexual wording, real URLs, real handles or real names. Trigger events SHALL be described generically and SHALL NOT be attributed to real events, states, groups or people.

#### Scenario: Synthetic label
- **WHEN** any output file is opened
- **THEN** it states near the top, or in its name, that the data is synthetic

#### Scenario: No real identifiers
- **WHEN** the descriptions and link clusters are searched for URLs, @-handles or personal names
- **THEN** none are found
