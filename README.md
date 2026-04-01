# Transit map editor
A transit map editor that uses GTFS data to guide the map making. Runs completely locally in the browser.

## Current features
- GTFS importing (url and file upload)
    - The GTFS is parsed into a sqlite DB running in OPFS (origin private file system), which allows the caching of large datasets
- Basic editor
    - SVG-based for easier saving
    - Object selection and moving
    - Two modes: Draw and move
