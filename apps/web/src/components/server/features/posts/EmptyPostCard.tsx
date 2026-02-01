import Marquee from "react-fast-marquee";

interface PostCardProps {
  direction?: "left" | "right";
  className?: string;
}

export default function EmptyPostCard({
  direction = "left",
  className = "",
}: PostCardProps) {
  return (
    <Marquee
      speed={40}
      autoFill={true}
      className={"h-full text-6xl" + className}
      //   gradient={true}
      //   gradientWidth={60}
      //   gradientColor="var(--color-background)"
      direction={direction}
    >
      <span className="text-stroke-1 text-stroke-current">Empty</span>
      <span className="px-6">/</span>
    </Marquee>
  );
}
