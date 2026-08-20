import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import type { AuthorizationService } from '@core/authorization/authorization.service';
import type { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import type { LoggerService } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { ContributionsAnalyzeTool } from './contributions-analyze.tool';

/**
 * Regression guard (006-collab-content-unification): a memo's content is a Yjs-V2 snapshot
 * (WS/pointer-only; the inline `memo.content` column is dropped) and is NOT UTF-8 text.
 * The bulk contributions analysis must surface title/description only for memos — mirroring
 * the whiteboard case — and must NEVER read a `content` Buffer or `Buffer.toString('utf-8')`
 * it. RED against the pre-fix code, which set `item.content.memoContent` from the bytes.
 */
describe('ContributionsAnalyzeTool — memo contribution is metadata-only', () => {
  const makeTool = () =>
    new ContributionsAnalyzeTool(
      {} as EntityManager,
      {} as AuthorizationService,
      {} as SpaceLookupService,
      {
        error: () => undefined,
        warn: () => undefined,
        verbose: () => undefined,
      } as unknown as LoggerService
    );

  it('surfaces title/description only and never reads memo content bytes', async () => {
    const tool = makeTool();
    const memoContribution = {
      id: 'contrib-1',
      type: CalloutContributionType.MEMO,
      createdBy: 'user-1',
      createdDate: new Date(),
      updatedDate: new Date(),
      memo: {
        profile: { displayName: 'My Memo', description: 'a memo description' },
        // Even if a legacy-shaped `content` Buffer is present, the tool MUST ignore it
        // (Yjs-V2 binary, not UTF-8) — proves the fix, and that no decode is attempted.
        content: Buffer.from([0x00, 0x01, 0x02, 0xff]),
      },
    };

    const item = await (
      tool as unknown as {
        buildCompactContribution: (
          c: unknown,
          a: { actorID: string },
          s: boolean
        ) => Promise<{
          title?: string;
          description?: string;
          content?: { memoContent?: string };
        }>;
      }
    ).buildCompactContribution(memoContribution, { actorID: 'user-2' }, false);

    expect(item.title).toBe('My Memo');
    expect(item.description).toBe('a memo description');
    expect(item.content).toBeUndefined();
    expect(item.content?.memoContent).toBeUndefined();
  });
});
