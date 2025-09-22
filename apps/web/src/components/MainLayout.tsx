export default function MainLayout({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "horizontal" | "vertical";
}) {
  return (
    <div
      className={
        type === "horizontal"
          ? "h-[calc(100vh-156px)] overflow-y-hidden"
          : "overflow-y-auto"
      }
    >
      {children}
    </div>
  );
}
