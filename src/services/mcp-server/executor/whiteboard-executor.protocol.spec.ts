import { randomUUID } from 'node:crypto';
import { parseParentMessage } from './whiteboard-executor.protocol';

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
