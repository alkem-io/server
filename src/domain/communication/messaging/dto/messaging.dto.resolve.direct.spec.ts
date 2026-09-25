import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { ResolveDirectConversationsInput } from './messaging.dto.resolve.direct';

describe('ResolveDirectConversationsInput', () => {
  const ids = (n: number) => Array.from({ length: n }, () => randomUUID());

  it('accepts 1..100 recipient ids', async () => {
    for (const n of [1, 100]) {
      const input = plainToInstance(ResolveDirectConversationsInput, {
        memberIDs: ids(n),
      });
      expect(await validate(input)).toEqual([]);
    }
  });

  it('rejects an empty list and more than 100 ids before any processing', async () => {
    const empty = plainToInstance(ResolveDirectConversationsInput, {
      memberIDs: [],
    });
    expect((await validate(empty)).length).toBeGreaterThan(0);

    const tooMany = plainToInstance(ResolveDirectConversationsInput, {
      memberIDs: ids(101),
    });
    const errors = await validate(tooMany);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('arrayMaxSize');
  });

  it('rejects non-UUID ids', async () => {
    const input = plainToInstance(ResolveDirectConversationsInput, {
      memberIDs: ['not-a-uuid'],
    });
    expect((await validate(input)).length).toBeGreaterThan(0);
  });
});
