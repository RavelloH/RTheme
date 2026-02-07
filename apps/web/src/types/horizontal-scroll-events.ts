export interface HorizontalScrollEventMap {
  [eventName: string]: (message: unknown) => void | Promise<void>;
  "horizontal-scroll-progress": (message: unknown) => void | Promise<void>;
}
