# Changelog

## [1.1.0]

### Added

- Save a run as a baseline and compare later runs against it, with per-metric and per-location deltas.
- Switch the highest-latency list between the top 5, 10, or 15 locations, remembered across sessions.
- Live statistics that update automatically as ping results stream in.
- Median and p95 of the average latency alongside the existing means.
- Manual refresh button and CSV/JSON export of the per-location data.
- Friendly status messages when the page has no results yet or isn't an mtr.tools page.

### Changed

- Redesigned the popup as a network latency readout with a colour-coded health scale.
- Grid columns are now matched by header text instead of fixed positions.
- The content script is injected on demand only, removing the duplicate manifest injection.
- Filtering and aggregation moved into the popup so results stay responsive.
- The highest-latency list scrolls on its own instead of stretching the popup.

### Fixed

- The Top 5 list now sorts and labels by average latency consistently.
- Empty result sets no longer render `NaN` in every field.
- Stats no longer lag behind while ping results are actively streaming in.
- The first snapshot is no longer occasionally missed when the popup opens.
- The content script no longer throws a redeclaration error when re-injected.
