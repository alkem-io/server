import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { grantAccessRefusal } from '@test/utils/authorization.refusal';
import { vi } from 'vitest';
import { CreateWhiteboardInSpaceTool } from './create-whiteboard-in-space.tool';

/**
 * Space resolution for `create_whiteboard_in_space` delegates to
 * `SpaceLookupService.getSpaceByIdOrNameIdOrFail` — UUID resolves any
 * space/subspace, anything else a TOP-LEVEL space nameID (URL slug); routing
 * itself is covered by space.lookup.service.spec.ts. Found live: the model
 * passed a space's slug and the tool refused it as "not found" even though
 * its own description said "resolve it from a name".
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
      getSpaceByIdOrNameIdOrFail: vi.fn().mockResolvedValue(space),
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

  it('resolves the spaceId (UUID or slug alike) via the shared id-or-nameID resolver', async () => {
    const { tool, spaceLookupService, calloutsSetResolverMutations } =
      buildTool();

    for (const spaceId of [SPACE_UUID, 'zimbabve']) {
      const result = await tool.execute(
        { spaceId, displayName: 'Test board' },
        actor()
      );

      expect(
        spaceLookupService.getSpaceByIdOrNameIdOrFail
      ).toHaveBeenCalledWith(
        spaceId,
        expect.objectContaining({ relations: expect.anything() })
      );
      expect(result.isError).toBeUndefined();
    }
    expect(
      calloutsSetResolverMutations.createCalloutOnCalloutsSet
    ).toHaveBeenCalledTimes(2);
  });

  it('rejects with the not-found of a missing space and creates nothing', async () => {
    const { tool, spaceLookupService, calloutsSetResolverMutations } =
      buildTool();
    const missing = new EntityNotFoundException(
      'Space not found',
      LogContext.SPACES
    );
    spaceLookupService.getSpaceByIdOrNameIdOrFail.mockRejectedValue(missing);

    await expect(
      tool.execute(
        { spaceId: 'no-such-space', displayName: 'Test board' },
        actor()
      )
    ).rejects.toBe(missing);
    expect(
      calloutsSetResolverMutations.createCalloutOnCalloutsSet
    ).not.toHaveBeenCalled();
  });

  it('rejects with a storage failure of the lookup as it is', async () => {
    const { tool, spaceLookupService } = buildTool();
    const failure = new Error('db down');
    spaceLookupService.getSpaceByIdOrNameIdOrFail.mockRejectedValue(failure);

    await expect(
      tool.execute({ spaceId: SPACE_UUID, displayName: 'Test board' }, actor())
    ).rejects.toBe(failure);
  });

  it('rejects with the refusal of the callout creation', async () => {
    const { tool, calloutsSetResolverMutations } = buildTool();
    const refusal = grantAccessRefusal(AuthorizationPrivilege.CREATE_CALLOUT);
    calloutsSetResolverMutations.createCalloutOnCalloutsSet.mockRejectedValue(
      refusal
    );

    await expect(
      tool.execute({ spaceId: SPACE_UUID, displayName: 'Test board' }, actor())
    ).rejects.toBe(refusal);
  });

  it('keeps the identifier advice in the spaceId description', () => {
    const { tool } = buildTool();
    const description = (tool.getDefinition().inputSchema.properties as any)
      .spaceId.description as string;

    expect(description).toContain('UUID');
    expect(description).toContain('nameID');
  });
});
