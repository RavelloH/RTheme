import type { GridArea } from "@/components/client/layout/RowGrid";

export function createArray(from: number, to: number): GridArea[] {
  const result: GridArea[] = [];
  for (let i = from; i <= to; i++) {
    result.push(i as GridArea);
  }
  return result;
}
