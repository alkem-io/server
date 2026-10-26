import { randomUUID } from 'node:crypto';
import {
  parseChildMessage,
  parseParentMessage,
} from './whiteboard-executor.protocol';

describe('whiteboard-executor launch messages', () => {
  const start = () => ({
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

  it('accepts the sole job identity only inside the grant', () => {
    expect(parseParentMessage(start()).success).toBe(true);
    expect(
      parseParentMessage({ ...start(), jobId: randomUUID() }).success
    ).toBe(false);
  });

  it('accepts import metadata exclusively and rejects embedded bytes on IPC', () => {
    const { operations: _operations, ...base } = start();
    const input = {
      scene: {
        type: 'excalidraw',
        version: 2,
        elements: [{ type: 'rectangle' }],
      },
      targetFileIDs: {},
    };
    expect(parseParentMessage({ ...base, import: input }).success).toBe(true);
    expect(parseParentMessage({ ...start(), import: input }).success).toBe(
      false
    );
    expect(parseParentMessage(base).success).toBe(false);
    expect(
      parseParentMessage({
        ...base,
        import: { ...input, scene: { ...input.scene, files: {} } },
      }).success
    ).toBe(false);
    expect(
      parseParentMessage({ ...base, import: { ...input, sourceFiles: {} } })
        .success
    ).toBe(false);
  });

  it('accepts import summaries through the existing result envelope', () => {
    const identity = { jobId: randomUUID(), generationId: 1 };
    const result = {
      addedElementIds: ['fresh'],
      summary: [{ op: 'importScene', elementIds: ['fresh'] }],
    };
    expect(
      parseChildMessage({ type: 'DURABLE', ...identity, result }).success
    ).toBe(true);
    expect(
      parseChildMessage({
        type: 'DURABLE',
        ...identity,
        result: { ...result, scene: {} },
      }).success
    ).toBe(false);
  });

  it.each([
    'jobId',
    'documentId',
    'actorId',
  ])('rejects empty and malformed %s', key => {
    for (const value of ['', 'not-a-uuid', null]) {
      const message = start();
      Object.assign(message.childLaunchGrant, { [key]: value });
      expect(parseParentMessage(message).success).toBe(false);
    }
  });

  it('rejects unknown intents, messages and malformed operation shapes', () => {
    const message = start();
    message.childLaunchGrant.intent = 'read';
    expect(parseParentMessage(message).success).toBe(false);
    expect(parseParentMessage({ type: 'READY' }).success).toBe(false);
    expect(
      parseParentMessage({ ...start(), operations: [{ op: 'setText' }] })
        .success
    ).toBe(false);
  });
});
