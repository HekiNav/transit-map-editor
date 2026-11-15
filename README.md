# Transit map editor
A transit map editor that uses GTFS data to guide the map making. Runs completely locally in the browser. The project is not completeand is in alpha.

## Current features
- GTFS importing (url and file upload)
    - The GTFS is parsed and processed, then pushed into a sqlite DB running in OPFS (origin private file system), which allows the caching of large datasets
- Basic editor
    - SVG-based for easier saving
    - Object selection and moving
    - Two modes: Draw and move
    - Stop editing and linking

## Running locally (vite)

1. Start dev server: `npm run dev`
2. Compile production build: `npm run build`
2. Preview production build: `npm run preview`