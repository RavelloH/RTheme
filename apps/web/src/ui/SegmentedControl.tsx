import React from "react";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  disabled?: boolean;
  className?: string;
  columns?: number; // 网格列数，默认根据选项数量自动调整
}

export function SegmentedControl<T extends string = string>({
  value,
  onChange,
  options,
  disabled = false,
  className = "",
  columns,
}: SegmentedControlProps<T>) {
  const gridCols = columns || Math.min(options.length, 4);

  const gridColsClass =
    {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
    }[gridCols] || "grid-cols-3";

  return (
    <div className={`grid ${gridColsClass} gap-4 ${className}`}>
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`p-4 pb-3 border-b-4 transition-all ${
              isSelected
                ? "border-b-primary bg-primary/10 text-primary"
                : "border-b-border hover:border-b-primary/50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="font-semibold mb-1">{option.label}</div>
            {option.description && (
              <div className="text-xs text-muted-foreground">
                {option.description}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
