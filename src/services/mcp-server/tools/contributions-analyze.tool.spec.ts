import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  policyGranting,
  realAuthorizationService,
  testActor,
} from '@test/utils/authorization.refusal';
import { vi } from 'vitest';
import { ContributionsAnalyzeTool } from './contributions-analyze.tool';

describe('ContributionsAnalyzeTool space scope', () => {
  it('joins through calloutsSet and retains resolved scope and row authorization', async () => {
    const query: Record<string, any> = {};
    for (const method of [
      'leftJoinAndSelect',
      'leftJoin',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'clone',
      'skip',
      'take',
    ]) {
      query[method] = vi.fn().mockReturnValue(query);
    }
    query.getMany = vi.fn().mockResolvedValue([
      { id: 'allowed', authorization: { id: 'readable' } },
      { id: 'denied', authorization: { id: 'private' } },
    ]);
    const isAccessGranted = vi.fn((_actor, policy) => policy.id === 'readable');
    const actor = new ActorContext();
    const tool = new ContributionsAnalyzeTool(
      { getRepository: () => ({ createQueryBuilder: () => query }) } as any,
      { isAccessGranted } as any,
      {} as any,
      {} as any
    );
    const rows = await (tool as any).fetchContributions(
      { type: 'space', spaceId: 'space-a' },
      actor,
      10
    );
    expect(query.leftJoin.mock.calls).toEqual([
      ['callout.calloutsSet', 'calloutsSet'],
      ['calloutsSet.collaboration', 'collaboration'],
      ['collaboration.space', 'space'],
    ]);
    expect(query.where).toHaveBeenCalledWith('space.id = :spaceId', {
      spaceId: 'space-a',
    });
    expect(rows.map((row: any) => row.id)).toEqual(['allowed']);
    expect(isAccessGranted).toHaveBeenCalledWith(
      actor,
      { id: 'private' },
      AuthorizationPrivilege.READ
    );
  });
});

describe('ContributionsAnalyzeTool — a space scope the actor names', () => {
  const SPACE_ID = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';

  const build = (lookup: ReturnType<typeof vi.fn>, rows: unknown[] = []) => {
    const query: Record<string, any> = {};
    for (const method of [
      'leftJoinAndSelect',
      'leftJoin',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'clone',
      'skip',
      'take',
    ]) {
      query[method] = vi.fn().mockReturnValue(query);
    }
    query.getMany = vi.fn().mockResolvedValue(rows);
    const createQueryBuilder = vi.fn(() => query);
    const tool = new ContributionsAnalyzeTool(
      { getRepository: () => ({ createQueryBuilder }) } as any,
      realAuthorizationService(),
      { getSpaceByIdOrNameIdOrFail: lookup } as any,
      { verbose: vi.fn(), error: vi.fn() } as any
    );
    const run = () => tool.execute({ scope: `space:${SPACE_ID}` }, testActor());
    return { tool, run, createQueryBuilder };
  };

  it('rejects with the not-found of a missing space', async () => {
    const missing = new EntityNotFoundException(
      'Space not found',
      LogContext.SPACES
    );
    const { run } = build(vi.fn().mockRejectedValue(missing));

    await expect(run()).rejects.toBe(missing);
  });

  it('rejects with a storage failure of the lookup as it is', async () => {
    const failure = new Error('db down');
    const { run } = build(vi.fn().mockRejectedValue(failure));

    await expect(run()).rejects.toBe(failure);
  });

  it('keeps the identifier advice in the scope description', () => {
    const { tool } = build(vi.fn());
    const description = (tool.getDefinition().inputSchema.properties as any)
      .scope.description as string;

    expect(description).toContain('UUID');
    expect(description).toContain('nameID');
  });

  it('gives the readable contributions of a space the actor may see', async () => {
    const space = {
      id: SPACE_ID,
      authorization: policyGranting([AuthorizationPrivilege.READ_ABOUT]),
    };
    const { run } = build(vi.fn().mockResolvedValue(space), [
      {
        id: 'readable',
        type: 'post',
        authorization: policyGranting([AuthorizationPrivilege.READ]),
      },
      { id: 'private', type: 'post', authorization: policyGranting([]) },
    ]);

    const result = await run();

    expect(result.isError).toBeFalsy();
    expect(JSON.parse(result.content[0].text!).summary.totalContributions).toBe(
      1
    );
  });

  it('gives an empty result for a visible space with no readable contributions', async () => {
    const space = {
      id: SPACE_ID,
      authorization: policyGranting([AuthorizationPrivilege.READ_ABOUT]),
    };
    const { run } = build(vi.fn().mockResolvedValue(space), []);

    const result = await run();

    expect(result.isError).toBeFalsy();
    expect(JSON.parse(result.content[0].text!).summary.totalContributions).toBe(
      0
    );
  });

  it('refuses a space the actor may not see and queries nothing', async () => {
    const space = { id: SPACE_ID, authorization: policyGranting([]) };
    const { run, createQueryBuilder } = build(vi.fn().mockResolvedValue(space));

    await expect(run()).rejects.toBeInstanceOf(
      ForbiddenAuthorizationPolicyException
    );
    expect(createQueryBuilder).not.toHaveBeenCalled();
  });

  it('refuses a space loaded with no policy', async () => {
    const { run } = build(
      vi.fn().mockResolvedValue({ id: SPACE_ID, authorization: undefined })
    );

    await expect(run()).rejects.toBeInstanceOf(ForbiddenException);
  });
});
