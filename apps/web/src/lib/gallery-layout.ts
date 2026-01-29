export const GallerySize = {
  SQUARE: "SQUARE",
  WIDE: "WIDE",
  TALL: "TALL",
  LARGE: "LARGE",
  AUTO: "AUTO",
};

export type TileType = "cube" | "fat" | "tall" | "bigCube4";

export interface GalleryPhoto {
  id: number;
  slug: string;
  size: string; // Matches GallerySize values
  imageUrl: string;
  blur?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  name?: string;
}

export interface Tile {
  id: number;
  type: TileType;
  slug: string;
  col: number;
  row: number;
  imageUrl: string;
  blur?: string | null;
  width?: number;
  height?: number;
  alt?: string | null;
}

export interface LayoutState {
  grid: number[][];
  squareCounter: number;
  // We can track the starting column for search to optimize performance in infinite scroll,
  // but strictly speaking the original algorithm always searched from 0 to fill gaps.
  // For infinite scroll, we usually don't want to fill gaps in previous "pages",
  // so we might want to track a 'safe' start column.
  // For now, let's keep it simple and just store the grid.
}

export const initialLayoutState: LayoutState = {
  grid: [], // Will be initialized to 4 rows on demand or we can pre-init
  squareCounter: 0,
};

const variants = {
  cube: { w: 1, h: 1 },
  fat: { w: 2, h: 1 },
  tall: { w: 1, h: 2 },
  bigCube4: { w: 2, h: 2 },
};

export function generateLayout(
  photos: GalleryPhoto[],
  existingState?: LayoutState,
): { tiles: Tile[]; nextState: LayoutState } {
  // Deep clone state to avoid mutation of input prop
  const state: LayoutState = existingState
    ? JSON.parse(JSON.stringify(existingState))
    : JSON.parse(JSON.stringify(initialLayoutState));

  // Ensure grid has 4 rows
  for (let r = 0; r < 4; r++) {
    if (!state.grid[r]) state.grid[r] = [];
  }

  const tiles: Tile[] = [];

  function ensureCol(col: number) {
    for (let r = 0; r < 4; r++) {
      if (state.grid[r]![col] === undefined) state.grid[r]![col] = 0;
    }
  }

  function canPlace(col: number, row: number, w: number, h: number) {
    if (row + h > 4) return false;
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        ensureCol(c);
        if (state.grid[r]?.[c] === 1) return false;
      }
    }
    return true;
  }

  function occupy(col: number, row: number, w: number, h: number) {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        // ensureCol is called in findPosition -> canPlace, but just in case
        if (!state.grid[r]) state.grid[r] = [];
        state.grid[r]![c] = 1;
      }
    }
  }

  function findPosition(w: number, h: number) {
    // Optimization: Start searching from a reasonable column?
    // For now, keep original behavior: scan from 0 to fill holes.
    // In a real infinite scroll, we might want to start from `min(last_cols)`.
    // But let's stick to the original logic first.
    for (let col = 0; col < 10000; col++) {
      // Increased limit for safety
      ensureCol(col);
      for (let row = 0; row < 4; row++) {
        if (canPlace(col, row, w, h)) {
          occupy(col, row, w, h);
          return { col, row };
        }
      }
    }
    return { col: 0, row: 0 };
  }

  for (const photo of photos) {
    let type: TileType = "cube";

    if (photo.size === GallerySize.AUTO && photo.width && photo.height) {
      const ratio = photo.width / photo.height;
      if (ratio >= 1.5) {
        type = "fat";
      } else if (ratio <= 0.66) {
        type = "tall";
      } else {
        // Treat as square-ish for the counter logic
        // NOTE: The original code logic for 'AUTO' square-ish was:
        /*
          if (squareCounter % 10 === 9) { type = "bigCube4"; } else { type = "cube"; }
          squareCounter++;
        */
        // But wait, there was a discrepancy in my reading of the original file?
        // Let me double check the original file content provided in the prompt.
        // Original:
        // if (squareCounter % 10 === 9) { type = "bigCube4"; } else { type = "cube"; } squareCounter++;

        if (state.squareCounter % 5 === 1) {
          type = "bigCube4";
        } else {
          type = "cube";
        }
        state.squareCounter++;
      }
    } else if (photo.size === GallerySize.TALL) {
      type = "tall";
    } else if (photo.size === GallerySize.WIDE) {
      type = "fat";
    } else if (photo.size === GallerySize.LARGE) {
      type = "bigCube4";
    } else {
      // SQUARE or default fallback
      if (state.squareCounter % 5 === 1) {
        type = "bigCube4";
      } else {
        type = "cube";
      }
      state.squareCounter++;
    }

    const variant = variants[type];
    const pos = findPosition(variant.w, variant.h);

    tiles.push({
      id: photo.id,
      slug: photo.slug,
      type: type,
      col: pos.col,
      row: pos.row,
      imageUrl: photo.imageUrl,
      blur: photo.blur,
      width: photo.width || undefined,
      height: photo.height || undefined,
      alt: photo.alt || photo.name,
    });
  }

  return { tiles, nextState: state };
}
