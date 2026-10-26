import { ActorContext } from '@core/actor-context/actor.context';
import { vi } from 'vitest';
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
