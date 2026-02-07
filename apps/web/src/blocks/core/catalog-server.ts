import "server-only";

import type { RuntimeBlockInput } from "@/blocks/core/definition";

type LegacyBusinessFetcher = (block: RuntimeBlockInput) => Promise<unknown>;

const businessFetcherLoaders: Record<string, () => Promise<unknown>> = {
  default: () =>
    import("@/blocks/collection/Default/fetcher").then(
      (fetcherModule) => fetcherModule.defaultBlockFetcher,
    ),
  hero: () =>
    import("@/blocks/collection/HeroGallery/fetcher").then(
      (fetcherModule) => fetcherModule.heroFetcher,
    ),
  projects: () =>
    import("@/blocks/collection/RecentProjects/fetcher").then(
      (fetcherModule) => fetcherModule.projectsFetcher,
    ),
  posts: () =>
    import("@/blocks/collection/RecentPosts/fetcher").then(
      (fetcherModule) => fetcherModule.postsFetcher,
    ),
  "tags-categories": () =>
    import("@/blocks/collection/TagsCategories/fetcher").then(
      (fetcherModule) => fetcherModule.tagsCategoriesFetcher,
    ),
  accordion: () =>
    import("@/blocks/collection/Accordion/fetcher").then(
      (fetcherModule) => fetcherModule.accordionFetcher,
    ),
  "paged-posts": () =>
    import("@/blocks/collection/PagedPosts/fetcher").then(
      (fetcherModule) => fetcherModule.pagedPostsFetcher,
    ),
  pagination: () =>
    import("@/blocks/collection/Pagination/fetcher").then(
      (fetcherModule) => fetcherModule.paginationFetcher,
    ),
  quote: () =>
    import("@/blocks/collection/Quote/fetcher").then(
      (fetcherModule) => fetcherModule.quoteBlockFetcher,
    ),
  divider: () =>
    import("@/blocks/collection/Divider/fetcher").then(
      (fetcherModule) => fetcherModule.dividerBlockFetcher,
    ),
  cards: () =>
    import("@/blocks/collection/Cards/fetcher").then(
      (fetcherModule) => fetcherModule.cardsBlockFetcher,
    ),
  cta: () =>
    import("@/blocks/collection/CallToAction/fetcher").then(
      (fetcherModule) => fetcherModule.ctaBlockFetcher,
    ),
  author: () =>
    import("@/blocks/collection/Author/fetcher").then(
      (fetcherModule) => fetcherModule.authorBlockFetcher,
    ),
  "social-links": () =>
    import("@/blocks/collection/SocialLinks/fetcher").then(
      (fetcherModule) => fetcherModule.socialLinksBlockFetcher,
    ),
  testimonial: () =>
    import("@/blocks/collection/Testimonials/fetcher").then(
      (fetcherModule) => fetcherModule.testimonialBlockFetcher,
    ),
  tabs: () =>
    import("@/blocks/collection/Tabs/fetcher").then(
      (fetcherModule) => fetcherModule.tabsBlockFetcher,
    ),
  gallery: () =>
    import("@/blocks/collection/Gallery/fetcher").then(
      (fetcherModule) => fetcherModule.galleryBlockFetcher,
    ),
  "multi-row-layout": () =>
    import("@/blocks/collection/MultiRowLayout/fetcher").then(
      (fetcherModule) => fetcherModule.multiRowLayoutFetcher,
    ),
  "timeline-item": () =>
    import("@/blocks/collection/Timeline/fetcher").then(
      (fetcherModule) => fetcherModule.timelineItemBlockFetcher,
    ),
  "archive-calendar": () =>
    import("@/blocks/collection/ArchiveCalendar/fetcher").then(
      (fetcherModule) => fetcherModule.archiveCalendarBlockFetcher,
    ),
};

export async function loadBlockBusinessFetcher(
  type: string,
): Promise<LegacyBusinessFetcher | null> {
  const loader = businessFetcherLoaders[type];
  if (!loader) {
    return null;
  }

  return (await loader()) as LegacyBusinessFetcher;
}
