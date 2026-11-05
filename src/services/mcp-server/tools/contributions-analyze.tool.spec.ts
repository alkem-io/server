import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
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
