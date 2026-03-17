import { ITask } from './dto/';
import { TaskResolverFields } from './task.resolver.fields';

describe('TaskResolverFields', () => {
  let resolver: TaskResolverFields;

  beforeEach(() => {
    resolver = new TaskResolverFields();
  });

  describe('progress', () => {
    it('should return undefined when itemsCount is null', () => {
      const task = { itemsCount: null } as unknown as ITask;
      expect(resolver.progress(task)).toBeUndefined();
    });

    it('should return undefined when itemsCount is undefined', () => {
      const task = { itemsCount: undefined } as ITask;
      expect(resolver.progress(task)).toBeUndefined();
    });

    it('should return the ratio of itemsDone to itemsCount', () => {
      const task = { itemsCount: 10, itemsDone: 3 } as ITask;
      expect(resolver.progress(task)).toBe(0.3);
    });

    it('should round result to 2 decimal places', () => {
      const task = { itemsCount: 3, itemsDone: 1 } as ITask;
      expect(resolver.progress(task)).toBe(0.33);
    });

    it('should use fallback of 1 when itemsDone is undefined', () => {
      const task = { itemsCount: 4, itemsDone: undefined } as ITask;
      // (1 / 4) = 0.25
      expect(resolver.progress(task)).toBe(0.25);
    });

    it('should return Infinity when itemsCount is 0', () => {
      const task = { itemsCount: 0, itemsDone: 5 } as ITask;
      expect(resolver.progress(task)).toBe(Infinity);
    });

    it('should return 1 when all items are done', () => {
      const task = { itemsCount: 5, itemsDone: 5 } as ITask;
      expect(resolver.progress(task)).toBe(1);
    });

    it('should return 0 when no items are done', () => {
      const task = { itemsCount: 10, itemsDone: 0 } as ITask;
      expect(resolver.progress(task)).toBe(0);
    });
  });
});
