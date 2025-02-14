export interface ILifecycleFields<T> {
  state(parent: T): string;

  nextEvents(parent: T): string[];

  isFinalized(parent: T): boolean;
}
