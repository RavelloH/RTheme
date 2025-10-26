import { LoadingIndicator } from "@/ui/LoadingIndicator";

export default function Loading() {
  return (
    <div className="w-full h-full text-muted flex items-center justify-center">
      <LoadingIndicator />
    </div>
  );
}
