import type {
  BackupDryRunResult,
  BackupSource,
} from "@repo/shared-types/api/backup";
import { create } from "zustand";

interface BackupStoreState {
  dryRunResult: BackupDryRunResult | null;
  importSource: BackupSource | null;
  setDryRunResult: (result: BackupDryRunResult, source: BackupSource) => void;
  clearDryRunResult: () => void;
}

export const useBackupStore = create<BackupStoreState>((set) => ({
  dryRunResult: null,
  importSource: null,
  setDryRunResult: (result, source) =>
    set({
      dryRunResult: result,
      importSource: source,
    }),
  clearDryRunResult: () =>
    set({
      dryRunResult: null,
      importSource: null,
    }),
}));
