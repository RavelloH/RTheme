"use client";

import { GridItem } from "@/components/RowGrid";

export default function DoctorHistoryChart() {
  return (
    <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5} className="py-10">
      <div className="text-2xl mb-2 px-10">运行状况历史趋势</div>
    </GridItem>
  );
}
