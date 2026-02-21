import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: "https://github.com/RavelloH/NeutralPress",
    nav: {
      title: (
        <>
          <img
            src="/icon-light.png"
            alt=""
            className="h-7 w-auto dark:hidden"
          />
          <img
            src="/icon-dark.png"
            alt=""
            className="hidden h-7 w-auto dark:block"
          />
          NeutralPress Docs
        </>
      ),
    },
  };
}
