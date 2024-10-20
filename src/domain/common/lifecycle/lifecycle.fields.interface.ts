export interface ILifecycleFields {
  state(parent: any): string;

  nextEvents(parent: any): string[];

  isFinalized(parent: any): boolean;
}
