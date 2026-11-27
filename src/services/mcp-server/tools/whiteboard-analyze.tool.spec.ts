import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { DocumentPurgingError } from '@services/collaboration-client/collaboration-document.session';
import {
  policyGranting,
  realAuthorizationService,
  testActor,
} from '@test/utils/authorization.refusal';
import { vi } from 'vitest';
import { McpServerService } from '../mcp-server.service';
import { ToolRegistry } from './tool.registry';
import { WhiteboardAnalyzeTool } from './whiteboard-analyze.tool';

vi.mock('@domain/common/whiteboard/whiteboard.fork', () => ({
  loadWhiteboardFork: async () => ({}),
}));

describe('WhiteboardAnalyzeTool elements', () => {
  it('projects actual text size and binding, omitting text fields on shapes', async () => {
    const elements = [
      {
        id: 'bound',
        type: 'text',
        text: 'Label',
        fontSize: 27,
        containerId: 'shape',
        x: 1,
        y: 2,
        width: 91,
        height: 33,
      },
      {
        id: 'free',
        type: 'text',
        text: 'Free',
        fontSize: 19,
        containerId: null,
      },
      { id: 'shape', type: 'rectangle', fontSize: 99, containerId: 'ignored' },
    ];
    const grantAccessOrFail = vi.fn();
    const tool = new WhiteboardAnalyzeTool(
      {
        getWhiteboardOrFail: vi.fn().mockResolvedValue({ authorization: {} }),
      } as any,
      { grantAccessOrFail } as any,
      { read: vi.fn().mockResolvedValue({ elements, files: {} }) } as any,
      {} as any
    );
    const result = await tool.execute(
      { whiteboardId: 'board', analysisType: 'elements' },
      new ActorContext()
    );
    const output = JSON.parse(result.content[0].text ?? '');
    expect(output.elements[0]).toMatchObject(elements[0]);
    expect(output.elements[1]).toMatchObject({
      fontSize: 19,
      containerId: null,
    });
    expect(output.elements[2]).not.toHaveProperty('fontSize');
    expect(output.elements[2]).not.toHaveProperty('containerId');
    expect(output).not.toHaveProperty('textContent');
    expect(grantAccessOrFail).toHaveBeenCalledOnce();
  });
});

describe('WhiteboardAnalyzeTool failures', () => {
  const build = (
    read: ReturnType<typeof vi.fn>,
    policy = policyGranting([AuthorizationPrivilege.READ])
  ) =>
    new WhiteboardAnalyzeTool(
      {
        getWhiteboardOrFail: vi
          .fn()
          .mockResolvedValue({ authorization: policy }),
      } as any,
      realAuthorizationService(),
      { read } as any,
      { verbose: vi.fn(), warn: vi.fn() } as any
    );

  it('lets a read failure propagate instead of turning it into text', async () => {
    const failure = new Error('collaboration down');
    const tool = build(vi.fn().mockRejectedValue(failure));

    await expect(
      tool.execute({ whiteboardId: 'board' }, testActor())
    ).rejects.toBe(failure);
  });

  it('keeps the answer for a whiteboard being deleted', async () => {
    const tool = build(
      vi.fn().mockRejectedValue(new DocumentPurgingError('board'))
    );

    const result = await tool.execute({ whiteboardId: 'board' }, testActor());

    expect(JSON.parse(result.content[0].text!).error).toBe(
      'Whiteboard board has been deleted.'
    );
  });

  it('reaches the caller as the neutral text when the actor may not read the board', async () => {
    delete process.env.ERROR_RESPONSE_DEBUG;
    const tool = build(vi.fn(), policyGranting([]));
    const logger = { error: vi.fn(), warn: vi.fn(), verbose: vi.fn() };
    const service = new McpServerService(
      {} as any,
      new ToolRegistry([tool], logger as any),
      {} as any,
      {} as any,
      { checkToolAllowed: vi.fn().mockResolvedValue(null) } as any,
      logger as any,
      {} as any
    );
    const handler = (service as any)
      .createMcpServer(testActor, () => [{ operations: ['tools'] }])
      .server._requestHandlers.get('tools/call');

    const result = await handler(
      {
        method: 'tools/call',
        params: {
          name: 'analyze_whiteboard',
          arguments: { whiteboardId: 'board' },
        },
      },
      { signal: new AbortController().signal }
    );

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: 'text',
        text: expect.stringMatching(
          /^\[FORBIDDEN_POLICY\] This is not available\. It may not exist, or you may not have access to it\. errorId=[0-9a-f-]{36}$/
        ),
      },
    ]);
  });
});
