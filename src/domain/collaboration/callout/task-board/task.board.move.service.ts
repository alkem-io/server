import { LogContext } from '@common/enums';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ValidationException } from '@common/exceptions';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { CalloutContributionService } from '@domain/collaboration/callout-contribution/callout.contribution.service';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { TagsetTemplate } from '@domain/common/tagset-template/tagset.template.entity';
import { matchAllowedValue } from '@domain/common/tagset-template/tagset.template.utils';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { TaskBoardService } from './task.board.service';

/**
 * The database-aware half of the Tasks board move: it loads a task and its
 * parent board, then moves the task to a column under a row lock. The pure
 * column rules live in {@link TaskBoardService}; this service owns only the
 * persistence and concurrency concerns.
 */
@Injectable()
export class TaskBoardMoveService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private calloutContributionService: CalloutContributionService,
    private taskBoardService: TaskBoardService
  ) {}

  /**
   * Moves a task to another column on its board. Authorization is enforced by
   * the caller against the parent Callout. The move takes a write lock on the
   * board's driving TagsetTemplate row so a concurrent column edit (rename,
   * delete, reorder) and a move never interleave: the column set the move
   * validates against is the set that is in force. Moving to the column the
   * task already occupies is a no-op. An unknown column, or a task that is not
   * on a board, is rejected.
   */
  public async moveTaskToColumn(
    contributionID: string,
    column: string
  ): Promise<ICalloutContribution> {
    const contribution =
      await this.calloutContributionService.getCalloutContributionOrFail(
        contributionID,
        {
          relations: {
            classification: { tagsets: true },
            callout: {
              classification: { tagsets: { tagsetTemplate: true } },
            },
          },
        }
      );

    const callout = contribution.callout;
    if (!callout || !this.taskBoardService.isTaskBoard(callout)) {
      throw new ValidationException(
        'This contribution is not a task on a Tasks board',
        LogContext.COLLABORATION,
        { contributionID }
      );
    }

    const boardTagset = this.taskBoardService.getTaskTagset(callout);
    const templateID = boardTagset?.tagsetTemplate?.id;
    if (!templateID) {
      throw new ValidationException(
        'The Tasks board has no column template',
        LogContext.COLLABORATION,
        { contributionID }
      );
    }

    const markerTagsetID = contribution.classification?.tagsets?.find(
      tagset => tagset.name === TagsetReservedName.TASK
    )?.id;
    if (!markerTagsetID) {
      throw new ValidationException(
        'The task has no column marker to move',
        LogContext.COLLABORATION,
        { contributionID }
      );
    }

    return this.entityManager.transaction(async manager => {
      // Lock the driving template row for the duration of the move so the
      // column set cannot change underneath the validation below.
      const lockedTemplate = await manager.findOne(TagsetTemplate, {
        where: { id: templateID },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedTemplate) {
        throw new ValidationException(
          'The Tasks board column template no longer exists',
          LogContext.COLLABORATION,
          { contributionID }
        );
      }

      const target = matchAllowedValue(lockedTemplate.allowedValues, column);
      if (!target) {
        throw new ValidationException(
          'The requested task column does not exist on this Tasks board',
          LogContext.COLLABORATION,
          { column }
        );
      }

      // Load the task's own marker tagset inside the transaction so the write
      // participates in the same unit of work as the lock.
      const markerTagset = await manager.findOne(Tagset, {
        where: { id: markerTagsetID },
      });
      if (!markerTagset) {
        throw new ValidationException(
          'The task has no column marker to move',
          LogContext.COLLABORATION,
          { contributionID }
        );
      }

      if (markerTagset.tags[0] !== target) {
        markerTagset.tags = [target];
        await manager.save(markerTagset);
      }

      return contribution;
    });
  }
}
