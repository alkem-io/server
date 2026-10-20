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
  it.each([
    undefined,
    null,
    0,
    10,
  ])('rejects supplied addText height %s before lookup or admission', async height => {
    const h = setup();
    for (const dimensions of [{ height }, { width: 100, height }]) {
      const result = await h.tool.execute(
        {
          ...h.args,
          operations: [{ op: 'addText', text: 'hello', ...dimensions }],
        },
        h.actor
      );
      expect(JSON.parse(result.content[0].text!)).toEqual({
        outcome: 'invalid',
      });
    }
    expect(h.executor.execute).not.toHaveBeenCalled();
    expect(h.whiteboard.getWhiteboardOrFail).not.toHaveBeenCalled();
  });
  it('retains explicit addShape height and addText width', async () => {
    const h = setup();
    const operations = [
      { op: 'addShape', shape: 'rectangle', width: 200, height: 100 },
      { op: 'addText', text: 'wrap me', width: 100 },
    ];
    const result = await h.tool.execute({ ...h.args, operations }, h.actor);
    expect(result.isError).toBeUndefined();
    expect(h.executor.execute).toHaveBeenCalledWith(
      h.args.whiteboardId,
      h.actor.actorID,
      operations,
      undefined
    );
  });
  it('reports disabled execution as unavailable without an updated claim', async () => {
    const h = setup();
    h.executor.execute.mockResolvedValueOnce({ outcome: 'unavailable' } as any);
    const result = await h.tool.execute(h.args, h.actor);
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text!)).toEqual({
      outcome: 'unavailable',
    });
    expect(h.executor.execute).toHaveBeenCalledOnce();
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
