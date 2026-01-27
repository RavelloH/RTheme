import type { GridArea } from "@/components/RowGrid";

export function createArray(from: number, to: number): GridArea[] {
  const result: GridArea[] = [];
  for (let i = from; i <= to; i++) {
    result.push(i as GridArea);
  }
  return result;
}
