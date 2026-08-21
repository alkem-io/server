import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { EditWhiteboardElementsTool } from './edit-whiteboard-elements.tool';

// The runtime loads the ESM fork via a Function-wrapped dynamic import that
// vitest's module runner cannot drive; mock the loader to a plain dynamic import
// so the test still exercises the REAL fork writer against a real Y.Doc.
vi.mock('@domain/common/whiteboard/whiteboard.fork', () => ({
  loadWhiteboardFork: () => import('@excalidraw-yjs/element/headless'),
}));

const WB_ID = 'wb-1';
const ctx = { actorID: 'actor-1' } as any;

/**
 * Native contract: `edit_whiteboard_elements` authorizes the whiteboard through the
 * SAME AuthorizationService as GraphQL, then applies the ops as an ephemeral Yjs
 * collaborator via `CollaborationDocumentService.mutate`. The collaborator mock
 * runs the mutator against a REAL `Y.Doc` (through the real fork writer), so these
 * tests exercise the actual write path and assert on the resulting doc — and prove
 * no room is joined without UPDATE_CONTENT.
 */
const buildTool = (opts: { granted?: boolean; found?: boolean } = {}) => {
  const granted = opts.granted ?? true;
  const found = opts.found ?? true;
  const whiteboardService = {
    getWhiteboardOrFail: found
      ? vi.fn().mockResolvedValue({ id: WB_ID, authorization: {} })
      : vi.fn().mockRejectedValue(new Error('not found')),
  };
  const authorizationService = {
    isAccessGranted: vi.fn().mockReturnValue(granted),
  };
  let mutatedDoc: Y.Doc | undefined;
  const collaborationService = {
    mutate: vi.fn(
      async (
        _id: string,
        _type: string,
        _actor: string,
        mutator: (doc: Y.Doc) => void
      ) => {
        mutatedDoc = new Y.Doc();
        mutator(mutatedDoc);
      }
    ),
  };
  const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const tool = new EditWhiteboardElementsTool(
    whiteboardService as any,
    authorizationService as any,
    collaborationService as any,
    logger as any
  );
  return {
    tool,
    whiteboardService,
    authorizationService,
    collaborationService,
    getDoc: () => mutatedDoc,
  };
};

describe('EditWhiteboardElementsTool (native Yjs)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('an authorized addShape applies through the collaborator and lands in the live doc', async () => {
    const { tool, collaborationService, getDoc } = buildTool();

    const result = await tool.execute(
      {
        whiteboardId: WB_ID,
        operations: [{ op: 'addShape', shape: 'rectangle' }],
      },
      ctx
    );

    expect(result.isError).toBeFalsy();
    expect(collaborationService.mutate).toHaveBeenCalledWith(
      WB_ID,
      'whiteboard',
      'actor-1',
      expect.any(Function)
    );
    // The real fork writer wrote one element into the shared Y.Doc.
    expect(getDoc()?.getMap('elements').size).toBe(1);
  });

  it('an UNAUTHORIZED edit is refused and never joins the room (no mutate)', async () => {
    const { tool, collaborationService } = buildTool({ granted: false });

    const result = await tool.execute(
      {
        whiteboardId: WB_ID,
        operations: [{ op: 'addShape', shape: 'rectangle' }],
      },
      ctx
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/Access denied/);
    expect(collaborationService.mutate).not.toHaveBeenCalled();
  });

  it('a missing whiteboard errors before joining any room', async () => {
    const { tool, collaborationService } = buildTool({ found: false });

    const result = await tool.execute(
      {
        whiteboardId: WB_ID,
        operations: [{ op: 'addShape', shape: 'rectangle' }],
      },
      ctx
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/not found/);
    expect(collaborationService.mutate).not.toHaveBeenCalled();
  });

  it('rejects an empty operations list without joining', async () => {
    const { tool, collaborationService } = buildTool();

    const result = await tool.execute(
      { whiteboardId: WB_ID, operations: [] },
      ctx
    );

    expect(result.isError).toBe(true);
    expect(collaborationService.mutate).not.toHaveBeenCalled();
  });
});
