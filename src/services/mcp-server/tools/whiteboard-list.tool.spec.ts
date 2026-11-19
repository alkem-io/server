import { testActor } from '@test/utils/authorization.refusal';
import { vi } from 'vitest';
import { WhiteboardListTool } from './whiteboard-list.tool';

describe('WhiteboardListTool failures', () => {
  it('lets a query failure propagate instead of turning it into text', async () => {
    const failure = new Error('db down');
    const tool = new WhiteboardListTool(
      {
        createQueryBuilder: vi.fn(() => {
          throw failure;
        }),
      } as any,
      {} as any,
      {} as any,
      { verbose: vi.fn(), error: vi.fn() } as any
    );

    await expect(tool.execute({}, testActor())).rejects.toBe(failure);
  });
});
