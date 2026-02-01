"use client";

import LinkButton from "@/components/ui/LinkButton";

export default function CategoriesRandomPage({
  options,
  text,
}: {
  options: string[];
  text?: string;
}) {
  return (
    <LinkButton
      mode="link"
      href={options[Math.floor(Math.random() * options.length)]}
      text={text || "Random / 随便看看"}
    />
  );
}
