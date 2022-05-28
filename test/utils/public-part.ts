export type PublicPart<T> = {
  [P in keyof T]?: unknown;
};
