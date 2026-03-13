import { PromptGraph } from '../../prompt-graph/dto/prompt.graph.dto';
import { PromptGraphTransformer } from './prompt.graph.transformer';

describe('PromptGraphTransformer', () => {
  describe('to', () => {
    it('should return the value as-is', () => {
      const graph = new PromptGraph();
      graph.nodes = [{ id: 'n1' } as any];

      const result = PromptGraphTransformer.to(graph);

      expect(result).toBe(graph);
    });

    it('should return undefined when value is undefined', () => {
      const result = PromptGraphTransformer.to(undefined);

      expect(result).toBeUndefined();
    });
  });

  describe('from', () => {
    it('should convert a plain object into a PromptGraph instance', () => {
      const raw = { nodes: [{ id: 'n1' }], edges: [] };

      const result = PromptGraphTransformer.from(raw);

      expect(result).toBeInstanceOf(PromptGraph);
      expect(result?.nodes).toEqual([{ id: 'n1' }]);
      expect(result?.edges).toEqual([]);
    });

    it('should return undefined when value is undefined', () => {
      const result = PromptGraphTransformer.from(undefined);

      expect(result).toBeUndefined();
    });

    it('should return undefined when value is null', () => {
      const result = PromptGraphTransformer.from(null);

      expect(result).toBeUndefined();
    });

    it('should return undefined when value is empty string (falsy)', () => {
      const result = PromptGraphTransformer.from('');

      expect(result).toBeUndefined();
    });

    it('should handle a non-empty object with extra properties', () => {
      const raw = { nodes: [], edges: [], start: 's1', end: 'e1', state: {} };

      const result = PromptGraphTransformer.from(raw);

      expect(result).toBeInstanceOf(PromptGraph);
      expect(result?.start).toBe('s1');
      expect(result?.end).toBe('e1');
    });
  });
});
