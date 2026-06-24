import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditWhiteboardElementsTool } from './edit-whiteboard-elements.tool';

const WB_ID = 'wb-1';

const sceneWith = (elements: unknown[]) =>
  JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: 'test',
    elements,
    appState: { x: 1 },
    files: {},
  });

/** Build the tool with mocked deps; `updated` captures the persisted scene string. */
const buildTool = (opts: { granted?: boolean; content?: string } = {}) => {
  const granted = opts.granted ?? true;
  const content = opts.content ?? sceneWith([]);
  const updateWhiteboardContent = vi.fn(async (_id: string, str: string) => {
    captured.savedScene = JSON.parse(str);
    return { id: WB_ID, nameID: 'wb-1-name' };
  });
  const captured: { savedScene?: any } = {};
  const whiteboardService = {
    getWhiteboardOrFail: vi.fn().mockResolvedValue({
      id: WB_ID,
      nameID: 'wb-1-name',
      content,
      authorization: {},
    }),
    updateWhiteboardContent,
  };
  const authorizationService = {
    isAccessGranted: vi.fn().mockReturnValue(granted),
  };
  const urlGeneratorService = {
    getWhiteboardUrlPath: vi.fn().mockResolvedValue('https://x/wb-1'),
  };
  const emit = vi.fn();
  const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const tool = new EditWhiteboardElementsTool(
    whiteboardService as any,
    authorizationService as any,
    urlGeneratorService as any,
    { emit } as any,
    logger as any
  );
  return { tool, whiteboardService, updateWhiteboardContent, emit, captured };
};

const ctx = { actorID: 'actor-1' } as any;

describe('EditWhiteboardElementsTool', () => {
  beforeEach(() => vi.clearAllMocks());

  it('addShape with a label appends two reciprocally-bound elements, below existing content', async () => {
    const existing = {
      id: 'old',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      isDeleted: false,
    };
    const { tool, updateWhiteboardContent, captured } = buildTool({
      content: sceneWith([existing]),
    });

    const result = await tool.execute(
      {
        whiteboardId: WB_ID,
        operations: [{ op: 'addShape', shape: 'rectangle', label: 'Start' }],
      },
      ctx
    );

    expect(result.isError).toBeFalsy();
    expect(updateWhiteboardContent).toHaveBeenCalledTimes(1);
    const els = captured.savedScene.elements;
    expect(els).toHaveLength(3); // old + container + label
    // envelope preserved
    expect(captured.savedScene.type).toBe('excalidraw');
    expect(captured.savedScene.appState).toEqual({ x: 1 });
    const container = els.find(
      (e: any) => e.type === 'rectangle' && e.id !== 'old'
    );
    const label = els.find((e: any) => e.type === 'text');
    expect(container.boundElements).toEqual([{ type: 'text', id: label.id }]);
    expect(label.containerId).toBe(container.id);
    // placed strictly below the existing content (no overlap)
    expect(container.y).toBeGreaterThanOrEqual(200 + 100);
  });

  it('honors explicit x/y on addShape', async () => {
    const { tool, captured } = buildTool();
    await tool.execute(
      {
        whiteboardId: WB_ID,
        operations: [{ op: 'addShape', shape: 'ellipse', x: 42, y: 99 }],
      },
      ctx
    );
    const el = captured.savedScene.elements[0];
    expect(el.x).toBe(42);
    expect(el.y).toBe(99);
  });

  it('connect binds an arrow to both endpoints; a missing id errors and does not save', async () => {
    const a = {
      id: 'a',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      isDeleted: false,
    };
    const b = {
      id: 'b',
      type: 'rectangle',
      x: 300,
      y: 0,
      width: 100,
      height: 100,
      isDeleted: false,
    };

    const ok = buildTool({ content: sceneWith([a, b]) });
    const okRes = await ok.tool.execute(
      {
        whiteboardId: WB_ID,
        operations: [{ op: 'connect', fromId: 'a', toId: 'b' }],
      },
      ctx
    );
    expect(okRes.isError).toBeFalsy();
    const arrow = ok.captured.savedScene.elements.find(
      (e: any) => e.type === 'arrow'
    );
    expect(arrow.startBinding.elementId).toBe('a');
    expect(arrow.endBinding.elementId).toBe('b');
    const aSaved = ok.captured.savedScene.elements.find(
      (e: any) => e.id === 'a'
    );
    expect(aSaved.boundElements).toContainEqual({
      type: 'arrow',
      id: arrow.id,
    });

    const bad = buildTool({ content: sceneWith([a]) });
    const badRes = await bad.tool.execute(
      {
        whiteboardId: WB_ID,
        operations: [{ op: 'connect', fromId: 'a', toId: 'missing' }],
      },
      ctx
    );
    expect(badRes.isError).toBe(true);
    expect(bad.updateWhiteboardContent).not.toHaveBeenCalled();
  });

  it('setText updates a text element in place', async () => {
    const t = {
      id: 't',
      type: 'text',
      x: 0,
      y: 0,
      width: 50,
      height: 25,
      text: 'old',
      originalText: 'old',
      version: 1,
      isDeleted: false,
    };
    const { tool, captured } = buildTool({ content: sceneWith([t]) });
    await tool.execute(
      {
        whiteboardId: WB_ID,
        operations: [{ op: 'setText', elementId: 't', text: 'new' }],
      },
      ctx
    );
    const saved = captured.savedScene.elements.find((e: any) => e.id === 't');
    expect(saved.text).toBe('new');
    expect(saved.originalText).toBe('new');
    expect(saved.version).toBe(2);
  });

  it('remove deletes the element, its bound label, and scrubs dangling refs', async () => {
    const shape = {
      id: 's',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      isDeleted: false,
      boundElements: [{ type: 'text', id: 'lbl' }],
    };
    const label = {
      id: 'lbl',
      type: 'text',
      x: 5,
      y: 5,
      width: 40,
      height: 20,
      text: 'hi',
      containerId: 's',
      isDeleted: false,
    };
    const other = {
      id: 'o',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      isDeleted: false,
      boundElements: [{ type: 'arrow', id: 'arr' }],
    };
    const arrow = {
      id: 'arr',
      type: 'arrow',
      x: 0,
      y: 0,
      width: 10,
      height: 0,
      startBinding: { elementId: 's' },
      endBinding: { elementId: 'o' },
      isDeleted: false,
    };
    const { tool, captured } = buildTool({
      content: sceneWith([shape, label, other, arrow]),
    });

    await tool.execute(
      { whiteboardId: WB_ID, operations: [{ op: 'remove', elementId: 's' }] },
      ctx
    );

    const ids = captured.savedScene.elements.map((e: any) => e.id);
    expect(ids).not.toContain('s');
    expect(ids).not.toContain('lbl'); // bound label cascaded
    const savedArrow = captured.savedScene.elements.find(
      (e: any) => e.id === 'arr'
    );
    expect(savedArrow.startBinding).toBeNull(); // dangling ref scrubbed
  });

  it('denies the write when UPDATE_CONTENT is not granted', async () => {
    const { tool, updateWhiteboardContent } = buildTool({ granted: false });
    const res = await tool.execute(
      { whiteboardId: WB_ID, operations: [{ op: 'addText', text: 'x' }] },
      ctx
    );
    expect(res.isError).toBe(true);
    expect(updateWhiteboardContent).not.toHaveBeenCalled();
  });

  it('emits CONTENT_UPDATED_EXTERNALLY on success, and a failing emit does not fail the tool', async () => {
    const { tool, emit } = buildTool();
    const res = await tool.execute(
      { whiteboardId: WB_ID, operations: [{ op: 'addText', text: 'hi' }] },
      ctx
    );
    expect(res.isError).toBeFalsy();
    expect(emit).toHaveBeenCalledWith(expect.anything(), {
      whiteboardId: WB_ID,
    });

    const throwing = buildTool();
    throwing.emit.mockImplementation(() => {
      throw new Error('broker down');
    });
    const res2 = await throwing.tool.execute(
      { whiteboardId: WB_ID, operations: [{ op: 'addText', text: 'hi' }] },
      ctx
    );
    expect(res2.isError).toBeFalsy();
  });

  it('rejects an empty operations array and unknown ops', async () => {
    const { tool } = buildTool();
    expect(
      (await tool.execute({ whiteboardId: WB_ID, operations: [] }, ctx)).isError
    ).toBe(true);
    expect(
      (
        await tool.execute(
          { whiteboardId: WB_ID, operations: [{ op: 'frobnicate' } as any] },
          ctx
        )
      ).isError
    ).toBe(true);
  });
});
