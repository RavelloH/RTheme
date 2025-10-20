"use client";

import { GridItem } from "@/components/RowGrid";
import { createArray } from "@/lib/client/createArray";

export default function DoctorHistoryTable() {
  return (
    <GridItem areas={createArray(1, 12)} width={2} height={2}>
      <div className="text-2xl mb-2 px-10">运行状况历史记录表格</div>
    </GridItem>
  );
}
