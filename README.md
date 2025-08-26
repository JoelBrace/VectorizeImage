# Color Grouping Vectorizer (Client‑side SVG Tracer)

A single‑page web app that converts a raster image (PNG/JPG) to a simplified vector SVG using a **user‑curated color palette**. It implements the full user flow described in your specification:

- Upload & preview
- Extract frequent colors (sampling step + max colors)
- Auto‑group by perceptual similarity (OKLab) with a **Similarity %** slider
- Manually drag chips between groups (only grouped colors are used)
- Two vectorization techniques:
  - **Contours (paths)** — traces region boundaries into `<path>`s with `fill-rule="evenodd"`
  - **Rect runs (cells)** — run‑length encoded `<rect>` rows (great for pixel‑style detail)
- Vector parameters: **Vector resolution (max dimension)**, **Vector detail (cell size)**, **Min island (cells)**
- Automatic **background fill** using the dominant label by area
- **Island cleanup**: remove tiny speckles by merging small connected components into the prevalent neighbor
- Live SVG preview with **click‑to‑recolor** (global replace by fill) and **Download SVG**

Everything runs **entirely in the browser**—no pixels leave the device.

---

## Getting started

### 0) Prerequisites
- Node.js 18+ and npm

> Rust/WebAssembly is **not required** for this build. The heavy algorithms run in a **Web Worker** in TypeScript. You can later swap in a Rust→WASM core behind the same message interface if you want even more speed.

### 1) Install
```bash
npm install
```

### 2) Run the dev server
```bash
npm run dev
```
Open the printed local URL in your browser.

### 3) Build for production
```bash
npm run build
npm run preview
```

---

## Usage

1. **Upload** a PNG or JPG (drag‑and‑drop or browse). The status line shows width × height and file size.
2. Click **Extract & Group**. Configure **Max colors**, **Sampling Step**, and **Similarity %** as needed.  
   - Chips are sized by frequency; hover for a tooltip with hex + share %.
3. **Arrange groups**: drag chips between group cards. Only colors in groups will be used for vectorization.
4. Open the **Vectorization** panel:
   - Choose **Technique**: *Contours* (paths) or *Rect runs* (rectangles).
   - Tune **Vector resolution** (max dim), **Vector detail** (cell size), and **Min island** (cells).
   - Click **Generate SVG**.
5. In the preview:
   - Click a **group swatch** to activate recolor; then click any shape in the SVG to replace **all shapes of that clicked color** with the active swatch color.
   - Click **Download SVG** to save the current (possibly recolored) SVG.

### Keyboard & accessibility
- All controls are keyboard‑focusable.
- Buttons/sliders have textual labels.
- Chips expose tooltips with hex + % via `title` attributes.
- Status messages are announced via `aria-live` regions.

---

## Implementation notes

- **Perceptual color space**: All distances are computed in **OKLab** (fast & well‑behaved for clustering and nearest‑color classification).
- **Auto‑grouping**: union‑find clustering where the threshold is tied to the 95th percentile of pairwise distances, scaled by the **Similarity %** slider.
- **Classification**: The raster is rescaled to the **Vector resolution** cap. A grid of **Vector detail (cell size)** samples each cell center and assigns it to the nearest group representative in OKLab space.
- **Island cleanup**: a BFS connected‑component pass merges components with area `< Min island` into the neighbor label with the largest shared border (majority adjacency).
- **Contours (paths)**: grid‑edge tracing builds **directed boundary segments** that are stitched into closed polygon loops; we emit `<path>` data with `fill-rule="evenodd"` for correct holes.
- **Rect runs (cells)**: horizontal run‑length rectangles per row.
- **Background fill**: the dominant label by area becomes a full‑canvas `<rect>` painted first. Shapes of that label are omitted to avoid redundant geometry.
- **Recoloring**: click‑to‑recolor updates all shapes sharing the clicked `fill`. We keep each element’s `data-original-fill` for future expansion (tolerance recolor, brush mode).

### Two‑color poster scenario (acceptance check)
Place only purple chips in one group and yellow chips in another; set **Min island** > 0; generate SVG. The resulting SVG contains only those two fills, and the background is a solid rectangle of the dominant color.

---

## Project structure

```
src/
  components/
    Uploader.tsx         # file picker + drag/drop + status line
    PalettePanel.tsx     # Extract & Group controls and chips
    GroupsGrid.tsx       # group cards + DnD
    VectorPanel.tsx      # technique + resolution/detail/island + Generate
    SvgPreview.tsx       # live preview, swatches, recolor, download
    StatusBar.tsx
  state/
    store.ts             # Zustand store
    types.ts
  workers/
    vectorize.worker.ts  # message bus + pipeline
    algorithms/
      color.ts           # OKLab math + hex utils
      sampling.ts        # frequency sampling with step
      grouping.ts        # similarity-based auto-grouping
      labeling.ts        # cell classification
      cc.ts              # island cleanup
      rectruns.ts        # rect-run emission
      contours.ts        # boundary tracing → paths
  App.tsx
  main.tsx
  styles.css
```

---

## Notes on performance & future enhancements

- This build already streams heavy work to a Web Worker to keep the UI responsive. For very large images, consider chunked processing and a progress bar.
- A **Rust → WASM** core can drop into `src/workers/vectorize.worker.ts` behind the same message types. Enable WASM SIMD/threads where hosting allows COOP/COEP.
- Future work outlined in your spec—background selection, tolerance recolor, brush mode, export optimizations, ARIA live regions for stepwise progress—can be added without changing the public UI.
