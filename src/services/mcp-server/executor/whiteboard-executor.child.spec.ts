import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import { CollaborationDocumentSession } from '../../collaboration-client/collaboration-document.session';
import { WhiteboardExecutorChild } from './whiteboard-executor.child';
import { ChildMessage, ParentMessage } from './whiteboard-executor.protocol';

const start = (): Extract<ParentMessage, { type: 'START' }> => ({
  type: 'START',
  operations: [{ op: 'addText', text: 'hello' }],
  childLaunchGrant: {
    jobId: randomUUID(),
    documentId: randomUUID(),
    actorId: randomUUID(),
    deadline: Date.now() + 10000,
    intent: 'edit-whiteboard-elements',
  },
});
const prepared = {
  ok: true as const,
  update: new Uint8Array([1, 2]),
  addedElementIds: ['created'],
  summary: [{ op: 'addText' as const, elementIds: ['created'] }],
};

function harness() {
  const messages: ChildMessage[] = [];
  let lost = () => {};
  const session = {
    connect: vi.fn().mockResolvedValue(undefined),
    isReadOnly: vi.fn().mockReturnValue(false),
    resend: vi.fn(),
    requestDurability: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    doc: {},
  };
  const prepare = vi.fn().mockReturnValue(prepared);
  const exit = vi.fn();
  const newSession = vi.fn((_grant, loss) => {
    lost = loss;
    return session as unknown as CollaborationDocumentSession;
  });
  const child = new WhiteboardExecutorChild(
    message => messages.push(message),
    exit,
    newSession,
    prepare
  );
  const command = start();
  const go = () =>
    child.receive({
      type: 'GO',
      jobId: command.childLaunchGrant.jobId,
      generationId: 1,
    });
  return {
    child,
    command,
    go,
    session,
    prepare,
    exit,
    newSession,
    messages,
    loss: () => lost(),
  };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('whiteboard-executor child publication boundary', () => {
  it('rejects malformed first START with a recoverable grant ID before joining', () => {
    const h = harness();
    h.child.receive({ ...h.command, operations: [{ op: 'setText' }] });
    expect(h.newSession).not.toHaveBeenCalled();
    expect(h.messages).toEqual([
      {
        type: 'FAILED',
        jobId: h.command.childLaunchGrant.jobId,
        typedOutcome: 'invalid',
      },
    ]);
    expect(h.exit).toHaveBeenCalledOnce();
  });
  it.each([
    'jobId',
    'documentId',
    'actorId',
    'intent',
  ])('rejects an invalid first grant %s', key => {
    const h = harness();
    Object.assign(h.command.childLaunchGrant, { [key]: '' });
    h.child.receive(h.command);
    expect(h.newSession).not.toHaveBeenCalled();
    expect(h.messages[0]).toMatchObject({
      type: 'FAILED',
      typedOutcome: 'invalid',
    });
  });
  it('rejects an elapsed deadline before room join', () => {
    const h = harness();
    h.command.childLaunchGrant.deadline = Date.now() - 1;
    h.child.receive(h.command);
    expect(h.newSession).not.toHaveBeenCalled();
    expect(h.messages[0]).toMatchObject({ typedOutcome: 'timeout-before-go' });
  });
  it('prepares once without publication and rejects second START without cancelling the job', async () => {
    const h = harness();
    h.child.receive(h.command);
    await flush();
    expect(h.messages.map(m => m.type)).toEqual(['SYNCED', 'PREPARED']);
    expect(h.session.resend).not.toHaveBeenCalled();
    h.child.receive(start());
    expect(h.messages.at(-1)).toMatchObject({
      type: 'FAILED',
      typedOutcome: 'invalid',
    });
    expect(h.exit).not.toHaveBeenCalled();
    h.go();
    await flush();
    expect(h.prepare).toHaveBeenCalledOnce();
    expect(h.newSession).toHaveBeenCalledOnce();
    expect(h.session.resend).toHaveBeenCalledExactlyOnceWith(prepared.update);
    expect(h.messages.at(-1)?.type).toBe('DURABLE');
  });
  it('room loss while PREPARED terminates; stale GO cannot publish or reconnect', async () => {
    const h = harness();
    h.child.receive(h.command);
    await flush();
    h.loss();
    h.go();
    await flush();
    expect(h.session.resend).not.toHaveBeenCalled();
    expect(h.prepare).toHaveBeenCalledOnce();
    expect(h.newSession).toHaveBeenCalledOnce();
    expect(h.messages.at(-1)).toMatchObject({
      typedOutcome: 'cancelled-before-go',
    });
  });
  it('rejects stale generation and pre-PREPARED GO without publication', async () => {
    const h = harness();
    h.child.receive(h.command);
    await flush();
    h.child.receive({
      type: 'GO',
      jobId: h.command.childLaunchGrant.jobId,
      generationId: 2,
    });
    expect(h.session.resend).not.toHaveBeenCalled();
    expect(h.messages.at(-1)).toMatchObject({ typedOutcome: 'invalid' });
  });
  it('late-invalid preparation has no PREPARED or room update', async () => {
    const h = harness();
    h.prepare.mockReturnValueOnce({
      ok: false,
      error: { category: 'invalid-operation' },
    } as any);
    h.child.receive(h.command);
    await flush();
    expect(h.messages.map(m => m.type)).toEqual(['SYNCED', 'FAILED']);
    expect(h.session.resend).not.toHaveBeenCalled();
  });
  it('independent admission refusal has no preparation or publication', async () => {
    const h = harness();
    h.session.connect.mockRejectedValueOnce(new Error('refused'));
    h.child.receive(h.command);
    await flush();
    expect(h.prepare).not.toHaveBeenCalled();
    expect(h.session.resend).not.toHaveBeenCalled();
    expect(h.exit).toHaveBeenCalledOnce();
  });
  it('same live child retries identical bytes without re-running semantics', async () => {
    const h = harness();
    h.session.requestDurability.mockRejectedValueOnce(
      new Error('connection lost')
    );
    h.child.receive(h.command);
    await flush();
    h.go();
    await flush();
    await flush();
    expect(h.prepare).toHaveBeenCalledOnce();
    expect(h.session.resend.mock.calls).toEqual([
      [prepared.update],
      [prepared.update],
    ]);
    expect(h.messages.at(-1)?.type).toBe('DURABLE');
  });
  it.each([
    false,
    true,
  ])('IPC loss has phase-correct outcome afterGo=%s', async afterGo => {
    const h = harness();
    h.session.requestDurability.mockReturnValue(new Promise(() => {}));
    h.child.receive(h.command);
    await flush();
    if (afterGo) h.go();
    h.child.disconnect();
    expect(h.messages.at(-1)).toMatchObject({
      typedOutcome: afterGo ? 'indeterminate-after-go' : 'cancelled-before-go',
    });
    expect(h.exit).toHaveBeenCalledOnce();
  });
});
