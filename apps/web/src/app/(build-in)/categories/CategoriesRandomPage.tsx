"use client";

import LinkButton from "@/components/LinkButton";

export default function CategoriesRandomPage({
  options,
}: {
  options: string[];
}) {
  return (
    <LinkButton
      mode="link"
      href={options[Math.floor(Math.random() * options.length)]}
      text={"Random / 随便看看"}
    />
  );
}
