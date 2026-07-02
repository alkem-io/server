import { ActorContext } from '@core/actor-context/actor.context';
import { vi } from 'vitest';
import { CreateWhiteboardInSpaceTool } from './create-whiteboard-in-space.tool';

/**
 * Space resolution for `create_whiteboard_in_space`: a UUID resolves any
 * space/subspace by id, anything else is treated as a TOP-LEVEL space nameID
 * (the URL slug) — the id the model most often has at hand. Found live: the
 * model passed a space's slug and the tool refused it as "not found" even
 * though its own description said "resolve it from a name".
 */
describe('create_whiteboard_in_space — space id/nameID resolution', () => {
  const SPACE_UUID = 'e0e2e08f-04cc-40dc-b40c-089b6cc27689';
  const CALLOUTS_SET_ID = 'callouts-set-1';

  const actor = (): ActorContext =>
    Object.assign(new ActorContext(), {
      actorID: 'user-1',
      isAnonymous: false,
      credentials: [],
    });

  const buildTool = () => {
    const space = {
      id: SPACE_UUID,
      collaboration: { calloutsSet: { id: CALLOUTS_SET_ID } },
    };
    const spaceLookupService = {
      getSpaceOrFail: vi.fn().mockResolvedValue(space),
      getSpaceByNameIdOrFail: vi.fn().mockResolvedValue(space),
    };
    const calloutsSetResolverMutations = {
      createCalloutOnCalloutsSet: vi
        .fn()
        .mockResolvedValue({ id: 'callout-1' }),
    };
    const calloutRepository = {
      findOne: vi.fn().mockResolvedValue(null),
    };
    const urlGeneratorService = {
      getWhiteboardUrlPath: vi.fn(),
    };
    const logger = { verbose: vi.fn(), warn: vi.fn() };

    const tool = new CreateWhiteboardInSpaceTool(
      calloutsSetResolverMutations as any,
      spaceLookupService as any,
      calloutRepository as any,
      {} as any, // templateService — unused without fromTemplateId
      {} as any, // authorizationService — unused without fromTemplateId
      urlGeneratorService as any,
      logger as any
    );
    return { tool, spaceLookupService, calloutsSetResolverMutations };
  };

  it('resolves a UUID via getSpaceOrFail (any level)', async () => {
    const { tool, spaceLookupService, calloutsSetResolverMutations } =
      buildTool();

    const result = await tool.execute(
      { spaceId: SPACE_UUID, displayName: 'Test board' },
      actor()
    );

    expect(spaceLookupService.getSpaceOrFail).toHaveBeenCalledWith(
      SPACE_UUID,
      expect.objectContaining({ relations: expect.anything() })
    );
    expect(spaceLookupService.getSpaceByNameIdOrFail).not.toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
    expect(
      calloutsSetResolverMutations.createCalloutOnCalloutsSet
    ).toHaveBeenCalled();
  });

  it('resolves a non-UUID as a top-level space nameID (URL slug)', async () => {
    const { tool, spaceLookupService, calloutsSetResolverMutations } =
      buildTool();

    const result = await tool.execute(
      { spaceId: 'zimbabve', displayName: 'Test board' },
      actor()
    );

    expect(spaceLookupService.getSpaceByNameIdOrFail).toHaveBeenCalledWith(
      'zimbabve',
      expect.objectContaining({ relations: expect.anything() })
    );
    expect(spaceLookupService.getSpaceOrFail).not.toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
    expect(
      calloutsSetResolverMutations.createCalloutOnCalloutsSet
    ).toHaveBeenCalled();
  });

  it('returns a guidance error when neither resolution finds the space', async () => {
    const { tool, spaceLookupService, calloutsSetResolverMutations } =
      buildTool();
    spaceLookupService.getSpaceByNameIdOrFail.mockRejectedValue(
      new Error('L0 Space not found')
    );

    const result = await tool.execute(
      { spaceId: 'no-such-space', displayName: 'Test board' },
      actor()
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Space not found: no-such-space');
    expect(result.content[0].text).toContain('nameID');
    expect(
      calloutsSetResolverMutations.createCalloutOnCalloutsSet
    ).not.toHaveBeenCalled();
  });
});
