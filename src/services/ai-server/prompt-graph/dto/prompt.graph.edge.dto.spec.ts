import { UpdateAiPersonaInput } from '@services/ai-server/ai-persona/dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PromptGraphEdge } from './prompt.graph.edge.dto';

describe('PromptGraphEdge map validation', () => {
  const validateMap = async (map: unknown) => {
    const edge = new PromptGraphEdge();
    edge.map = map as Record<string, string>;
    return validate(edge);
  };

  it('accepts a string-to-string routing map', async () => {
    await expect(
      validateMap({ answer: 'answer-node', retry: 'retry-node' })
    ).resolves.toEqual([]);
  });

  it('rejects a non-object routing map', async () => {
    await expect(validateMap(['answer', 'answer-node'])).resolves.toEqual([
      expect.objectContaining({ property: 'map' }),
    ]);
  });

  it('rejects a routing map with non-string values', async () => {
    await expect(validateMap({ answer: 1 })).resolves.toEqual([
      expect.objectContaining({ property: 'map' }),
    ]);
  });

  it('applies map validation through the persona update DTO', async () => {
    const input = plainToInstance(UpdateAiPersonaInput, {
      ID: 'persona-1',
      promptGraph: { edges: [{ map: ['answer', 'answer-node'] }] },
    });

    const errors = await validate(input);

    expect(errors[0].children?.[0].children?.[0].children).toEqual([
      expect.objectContaining({ property: 'map' }),
    ]);
  });

  it('rejects routing maps that exceed entry or field-size caps', async () => {
    const overEntryCap = Object.fromEntries(
      Array.from({ length: 101 }, (_, index) => [
        `route-${index}`,
        `node-${index}`,
      ])
    );

    await expect(validateMap(overEntryCap)).resolves.toEqual([
      expect.objectContaining({ property: 'map' }),
    ]);
    await expect(validateMap({ ['x'.repeat(129)]: 'target' })).resolves.toEqual(
      [expect.objectContaining({ property: 'map' })]
    );
    await expect(validateMap({ route: 'x'.repeat(129) })).resolves.toEqual([
      expect.objectContaining({ property: 'map' }),
    ]);
  });
});
