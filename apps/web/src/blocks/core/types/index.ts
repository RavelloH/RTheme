export type * from "./base";

// 导出所有子类型，方便直接引用
export type {
  DefaultBlockConfig,
  DefaultBlockContent,
} from "../../collection/Default/types";
export type {
  HeroBlockConfig,
  HeroBlockContent,
} from "../../collection/HeroGallery/types";
export type {
  PostsBlockConfig,
  PostsBlockContent,
} from "../../collection/RecentPosts/types";
export type {
  ProjectsBlockConfig,
  ProjectsBlockContent,
} from "../../collection/RecentProjects/types";
export type {
  TagsCategoriesBlockConfig,
  TagsCategoriesBlockContent,
} from "../../collection/TagsCategories/types";
export type {
  QuoteBlockConfig,
  QuoteBlockContent,
} from "../../collection/Quote/types";
export type {
  DividerBlockConfig,
  DividerBlockContent,
} from "../../collection/Divider/types";
export type {
  CardsBlockConfig,
  CardsBlockContent,
} from "../../collection/Cards/types";
export type {
  CallToActionBlockConfig,
  CallToActionBlockContent,
} from "../../collection/CallToAction/types";
export type {
  AuthorBlockConfig,
  AuthorBlockContent,
} from "../../collection/Author/types";
export type {
  SocialLinksBlockConfig,
  SocialLinksBlockContent,
  SocialPlatformLinks,
} from "../../collection/SocialLinks/types";
export type {
  TestimonialBlockConfig,
  TestimonialBlockContent,
} from "../../collection/Testimonials/types";
export type {
  TabsBlockConfig,
  TabsBlockContent,
  TabItem,
} from "../../collection/Tabs/types";
export type {
  GalleryBlockConfig,
  GalleryBlockContent,
  GalleryData,
} from "../../collection/Gallery/types";
export type {
  MultiRowLayoutBlockConfig,
  MultiRowLayoutBlockContent,
} from "../../collection/MultiRowLayout/types";
export type {
  TimelineItemBlockConfig,
  TimelineItemBlockContent,
} from "../../collection/Timeline/types";
export type {
  ArchiveCalendarBlockConfig,
  ArchiveCalendarBlockContent,
  ArchiveCalendarData,
  YearData,
  MonthData,
} from "../../collection/ArchiveCalendar/types";
export type {
  ArchiveListBlockConfig,
  ArchiveListBlockContent,
  ArchiveListData,
  ArchiveListItem,
  ArchiveListLayoutMode,
  ArchiveListMonthGroup,
  ArchiveListSortMode,
} from "../../collection/ArchiveList/types";
export type {
  AccordionBlockConfig,
  AccordionBlockContent,
} from "../../collection/Accordion/types";
export type {
  PagedPostsBlockConfig,
  PagedPostsBlockContent,
} from "../../collection/PagedPosts/types";
export type {
  PaginationBlockConfig,
  PaginationBlockContent,
} from "../../collection/Pagination/types";
