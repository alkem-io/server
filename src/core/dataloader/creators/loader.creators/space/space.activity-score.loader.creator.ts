import { ActivityEventType } from '@common/enums/activity.event.type';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { Space } from '@domain/space/space/space.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Activity } from '@platform/activity/activity.entity';
import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';

// Fixed 7-day window for the dashboard "activity score" — the only window the
// client consumes. Event types excluded match the dashboard feed
// (whiteboard-content-modified is noise), keeping this count aligned with the
// most-active ranking in SpaceService.getExploreSpaces.
const ACTIVITY_SCORE_DAYS_OLD = 7;
const EXCLUDED_ACTIVITY_TYPES = [
  ActivityEventType.CALLOUT_WHITEBOARD_CONTENT_MODIFIED,
];

/**
 * DataLoader creator resolving a Space's activity score in batch: the count of
 * visible activity events on the Space's own collaboration over the last 7 days
 * (all actors). Given N Space IDs it runs 2 queries total (Space→collaboration
 * map, then one grouped COUNT over `activity`) instead of 2N.
 */
@Injectable()
export class SpaceActivityScoreLoaderCreator
  implements DataLoaderCreator<number>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<number> {
    return new DataLoader<string, number>(
      spaceIds => this.batchLoad(spaceIds),
      { cache: true, name: 'SpaceActivityScoreLoader' }
    );
  }

  private async batchLoad(spaceIds: readonly string[]): Promise<number[]> {
    if (spaceIds.length === 0) {
      return [];
    }

    const since = new Date();
    since.setDate(since.getDate() - ACTIVITY_SCORE_DAYS_OLD);

    // Map each Space to its own collaboration (the activity join key); there is
    // no spaceID column on `activity`, the link is space.collaborationId.
    const spaceRows = await this.manager
      .createQueryBuilder(Space, 's')
      .select('s.id', 'id')
      .addSelect('s.collaborationId', 'collaborationId')
      .where('s.id IN (:...spaceIds)', { spaceIds: [...spaceIds] })
      .getRawMany<{ id: string; collaborationId: string | null }>();

    const collaborationBySpace = new Map<string, string | null>(
      spaceRows.map(row => [row.id, row.collaborationId])
    );
    const collaborationIds = [
      ...new Set(
        spaceRows
          .map(row => row.collaborationId)
          .filter((id): id is string => !!id)
      ),
    ];

    const countByCollaboration = new Map<string, number>();
    if (collaborationIds.length > 0) {
      const rows = await this.manager
        .getRepository(Activity)
        .createQueryBuilder('activity')
        .select('activity.collaborationID', 'collaborationID')
        .addSelect('COUNT(*)', 'count')
        .where('activity.collaborationID IN (:...collaborationIds)', {
          collaborationIds,
        })
        .andWhere('activity.createdDate >= :since', { since })
        .andWhere('activity.visibility = true')
        .andWhere('activity.type NOT IN (:...excludeTypes)', {
          excludeTypes: EXCLUDED_ACTIVITY_TYPES,
        })
        .groupBy('activity.collaborationID')
        .getRawMany<{ collaborationID: string; count: string }>();

      for (const row of rows) {
        countByCollaboration.set(
          row.collaborationID,
          Number.parseInt(row.count, 10)
        );
      }
    }

    return spaceIds.map(id => {
      const collaborationId = collaborationBySpace.get(id);
      return collaborationId
        ? (countByCollaboration.get(collaborationId) ?? 0)
        : 0;
    });
  }
}
