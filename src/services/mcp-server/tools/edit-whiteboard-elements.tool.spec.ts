import { randomUUID } from 'node:crypto';
import { ActorContext } from '@core/actor-context/actor.context';
import { vi } from 'vitest';
import { EditWhiteboardElementsTool } from './edit-whiteboard-elements.tool';

describe('EditWhiteboardElementsTool executor boundary', () => {
  const setup = (allowed = true) => {
    const executor = {
      execute: vi.fn().mockResolvedValue({
        outcome: 'durable-success',
        result: { addedElementIds: ['created'], summary: [] },
      }),
    };
    const whiteboard = {
      getWhiteboardOrFail: vi.fn().mockResolvedValue({ authorization: {} }),
    };
    const authorization = { isAccessGranted: vi.fn().mockReturnValue(allowed) };
    const tool = new EditWhiteboardElementsTool(
      whiteboard as any,
      authorization as any,
      executor as any
    );
    const actor = Object.assign(new ActorContext(), { actorID: randomUUID() });
    const args = {
      whiteboardId: randomUUID(),
      operations: [{ op: 'addText', text: 'hello' }],
    };
    return { tool, actor, args, executor, whiteboard };
  };
  it('authorization refusal never admits or spawns', async () => {
    const h = setup(false);
    const result = await h.tool.execute(h.args, h.actor);
    expect(result.isError).toBe(true);
    expect(h.executor.execute).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text!)).toEqual({
      outcome: 'unauthorized',
    });
  });
  it('invalid schema never admits or spawns', async () => {
    const h = setup();
    await h.tool.execute(
      { ...h.args, operations: [{ op: 'setText' }] },
      h.actor
    );
    expect(h.executor.execute).not.toHaveBeenCalled();
    expect(h.whiteboard.getWhiteboardOrFail).not.toHaveBeenCalled();
  });
  it('passes exactly the resolved actor and cancellation signal, returning only durable success', async () => {
    const h = setup();
    const signal = new AbortController().signal;
    const result = await h.tool.execute(h.args, h.actor, signal);
    expect(h.executor.execute).toHaveBeenCalledWith(
      h.args.whiteboardId,
      h.actor.actorID,
      h.args.operations,
      signal
    );
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text!)).toMatchObject({
      outcome: 'durable-success',
      updated: true,
    });
  });
  it('preserves typed indeterminate without a replay or updated claim', async () => {
    const h = setup();
    h.executor.execute.mockResolvedValueOnce({
      outcome: 'indeterminate-after-go',
    } as any);
    const result = await h.tool.execute(h.args, h.actor);
    expect(JSON.parse(result.content[0].text!)).toEqual({
      outcome: 'indeterminate-after-go',
    });
    expect(h.executor.execute).toHaveBeenCalledOnce();
  });
});
