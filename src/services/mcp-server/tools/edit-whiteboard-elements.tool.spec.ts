import { randomUUID } from 'node:crypto';
import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  policyGranting,
  realAuthorizationService,
  testActor,
} from '@test/utils/authorization.refusal';
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
    const policy = policyGranting(
      allowed ? [AuthorizationPrivilege.UPDATE_CONTENT] : []
    );
    const whiteboard = {
      getWhiteboardOrFail: vi.fn().mockResolvedValue({ authorization: policy }),
    };
    const logger = { error: vi.fn(), warn: vi.fn(), verbose: vi.fn() };
    const tool = new EditWhiteboardElementsTool(
      whiteboard as any,
      realAuthorizationService(),
      executor as any,
      logger as any
    );
    const actor = testActor();
    const args = {
      whiteboardId: randomUUID(),
      operations: [{ op: 'addText', text: 'hello' }],
    };
    return { tool, actor, args, executor, whiteboard, logger, policy };
  };
  const outcomeOf = (result: { content: Array<{ text?: string }> }) =>
    JSON.parse(result.content[0].text!);

  it('authorization refusal never admits or spawns', async () => {
    const h = setup(false);
    const result = await h.tool.execute(h.args, h.actor);
    expect(result.isError).toBe(true);
    expect(h.executor.execute).not.toHaveBeenCalled();
    const outcome = outcomeOf(result);
    expect(outcome).toEqual({
      outcome: 'unauthorized',
      errorId: expect.any(String),
    });
    expect(h.logger.error).toHaveBeenCalledOnce();
    expect(h.logger.error.mock.calls[0][0]).toEqual({
      errorId: outcome.errorId,
      exceptionName: 'ForbiddenAuthorizationPolicyException',
      code: 'FORBIDDEN_POLICY',
      privilege: AuthorizationPrivilege.UPDATE_CONTENT,
      policyId: h.policy.id,
      operation: 'edit_whiteboard_elements',
      actorID: h.actor.actorID,
    });
  });
  it('answers a missing board like a refused one, and logs which it was', async () => {
    const h = setup();
    const missing = new EntityNotFoundException(
      'Whiteboard not found',
      LogContext.COLLABORATION
    );
    h.whiteboard.getWhiteboardOrFail.mockRejectedValue(missing);

    const result = await h.tool.execute(h.args, h.actor);

    expect(outcomeOf(result)).toEqual({
      outcome: 'unauthorized',
      errorId: missing.errorId,
    });
    expect(h.logger.error).toHaveBeenCalledOnce();
    expect(h.logger.error.mock.calls[0][0]).toEqual({
      errorId: missing.errorId,
      exceptionName: 'EntityNotFoundException',
      code: 'ENTITY_NOT_FOUND',
      operation: 'edit_whiteboard_elements',
      actorID: h.actor.actorID,
    });
    expect(h.executor.execute).not.toHaveBeenCalled();
  });
  it('lets a storage failure while loading the board propagate', async () => {
    const h = setup();
    const failure = new Error('db down');
    h.whiteboard.getWhiteboardOrFail.mockRejectedValue(failure);

    await expect(h.tool.execute(h.args, h.actor)).rejects.toBe(failure);
    expect(h.logger.error).not.toHaveBeenCalled();
  });
  it('answers a board with no policy with unauthorized', async () => {
    const h = setup();
    h.whiteboard.getWhiteboardOrFail.mockResolvedValue({
      authorization: undefined,
    });

    const result = await h.tool.execute(h.args, h.actor);

    expect(outcomeOf(result)).toEqual({
      outcome: 'unauthorized',
      errorId: expect.any(String),
    });
  });
  it('keeps invalid input and an invalid actor without an errorId', async () => {
    const h = setup();

    const invalid = await h.tool.execute(
      { whiteboardId: 'nope', operations: [] },
      h.actor
    );
    const unauthorized = await h.tool.execute(
      h.args,
      Object.assign(new ActorContext(), { actorID: 'not-a-uuid' })
    );

    expect(outcomeOf(invalid)).toEqual({ outcome: 'invalid' });
    expect(outcomeOf(unauthorized)).toEqual({ outcome: 'unauthorized' });
    expect(h.logger.error).not.toHaveBeenCalled();
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
