import type { Mock } from 'vitest';

export type MockType<T> = {
  [P in keyof T]?: Mock;
};
