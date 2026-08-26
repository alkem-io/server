import { LogContext } from '@common/enums';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@common/exceptions';
import { Classification } from '@domain/common/classification/classification.entity';
import { ClassificationService } from '@domain/common/classification/classification.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UrlGeneratorCacheService } from '@services/infrastructure/url-generator/url.generator.service.cache';
import { Repository } from 'typeorm';
import { Callout } from '../callout/callout.entity';
import { CalloutContribution } from './callout.contribution.entity';
import { ICalloutContribution } from './callout.contribution.interface';
import { CalloutContributionService } from './callout.contribution.service';

@Injectable()
export class CalloutContributionMoveService {
  constructor(
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>,
    @InjectRepository(CalloutContribution)
    private calloutContributionRepository: Repository<CalloutContribution>,
    private calloutContributionService: CalloutContributionService,
    private classificationService: ClassificationService,
    private urlGeneratorCacheService: UrlGeneratorCacheService
  ) {}

  public async moveContributionToCallout(
    contributionID: string,
    calloutID: string
  ): Promise<ICalloutContribution> {
    const contribution =
      (await this.calloutContributionService.getCalloutContributionOrFail(
        contributionID,
        {
          relations: {
            callout: {
              calloutsSet: true,
            },
            // The task-column classification (present only for a task on a board)
            // is reconciled with the destination below.
            classification: {
              tagsets: true,
            },
            post: {
              profile: true,
            },
            whiteboard: {
              profile: true,
            },
            link: {
              profile: true,
            },
            memo: {
              profile: true,
            },
            collaboraDocument: {
              profile: true,
            },
          },
        }
      )) as CalloutContribution;
    const sourceCallout = contribution.callout;
    const targetCallout = await this.calloutRepository.findOne({
      where: { id: calloutID },
      relations: {
        calloutsSet: true,
        // Needed to detect whether the destination is a Tasks board and, if so,
        // to read its column template (allowedValues) when seeding the moved
        // post's task column.
        classification: {
          tagsets: {
            tagsetTemplate: true,
          },
        },
      },
    });

    if (!targetCallout) {
      throw new EntityNotFoundException(
        `Target Callout ${calloutID} not found.`,
        LogContext.COLLABORATION
      );
    }

    if (
      contribution.post &&
      !targetCallout.settings.contribution.allowedTypes.includes(
        CalloutContributionType.POST
      )
    ) {
      throw new NotSupportedException(
        'The destination callout does not allow contributions of type POST.',
        LogContext.COLLABORATION
      );
    }
    if (
      contribution.whiteboard &&
      !targetCallout.settings.contribution.allowedTypes.includes(
        CalloutContributionType.WHITEBOARD
      )
    ) {
      throw new NotSupportedException(
        'The destination callout does not allow contributions of type WHITEBOARD.',
        LogContext.COLLABORATION
      );
    }
    if (
      contribution.link &&
      !targetCallout.settings.contribution.allowedTypes.includes(
        CalloutContributionType.LINK
      )
    ) {
      throw new NotSupportedException(
        'The destination callout does not allow contributions of type LINK.',
        LogContext.COLLABORATION
      );
    }
    if (
      contribution.memo &&
      !targetCallout.settings.contribution.allowedTypes.includes(
        CalloutContributionType.MEMO
      )
    ) {
      throw new NotSupportedException(
        'The destination callout does not allow contributions of type MEMO.',
        LogContext.COLLABORATION
      );
    }
    if (
      contribution.collaboraDocument &&
      !targetCallout.settings.contribution.allowedTypes.includes(
        CalloutContributionType.COLLABORA_DOCUMENT
      )
    ) {
      throw new NotSupportedException(
        'The destination callout does not allow contributions of type COLLABORA_DOCUMENT.',
        LogContext.COLLABORATION
      );
    }

    if (targetCallout.calloutsSet?.id !== sourceCallout?.calloutsSet?.id) {
      throw new NotSupportedException(
        'A Contribution can only be moved between Callouts in the same CalloutsSet.',
        LogContext.COLLABORATION
      );
    }

    contribution.callout = targetCallout;

    // Reconcile the task-column classification with the destination callout. A
    // task's column is a per-contribution classification, and only POST
    // contributions can be tasks (Tasks boards are POST-only). Moving a post INTO
    // a board makes it a task in the board's first column; moving a task OUT to an
    // ordinary callout drops the column classification (it becomes a plain post);
    // moving between two boards re-seeds it on the destination board's first
    // column. Any previous classification is deleted after the save below.
    const previousClassificationId = contribution.classification?.id;
    if (contribution.post) {
      const targetBoardTemplate = targetCallout.classification?.tagsets?.find(
        tagset => tagset.name === TagsetReservedName.TASK
      )?.tagsetTemplate;
      if (targetBoardTemplate) {
        contribution.classification =
          this.classificationService.createClassification(
            [targetBoardTemplate],
            {
              tagsets: [
                {
                  name: TagsetReservedName.TASK,
                  tags: [targetBoardTemplate.allowedValues[0]],
                },
              ],
              // createClassification returns the IClassification interface; the
              // entity relation is typed as the concrete class (mirrors the create
              // path in CalloutContributionService).
            }
          ) as Classification;
      } else {
        // Detach the task classification. The relation is typed optional, but
        // TypeORM needs an explicit null to null the FK on save.
        (contribution as { classification: unknown }).classification = null;
      }
    }

    if (contribution?.post?.profile.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        contribution?.post?.profile.id
      );
    }
    if (contribution?.whiteboard?.profile.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        contribution?.whiteboard?.profile.id
      );
    }
    if (contribution?.link?.profile.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        contribution?.link?.profile.id
      );
    }
    if (contribution?.memo?.profile.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        contribution?.memo?.profile.id
      );
    }
    if (contribution?.collaboraDocument?.profile?.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        contribution?.collaboraDocument?.profile.id
      );
    }

    const movedContribution =
      await this.calloutContributionRepository.save(contribution);

    // The contribution now points at its new classification (or null), so the
    // pre-move classification is orphaned — delete it to leave no orphan behind.
    if (
      previousClassificationId &&
      previousClassificationId !== contribution.classification?.id
    ) {
      await this.classificationService.deleteClassification(
        previousClassificationId
      );
    }

    return movedContribution;
  }
}
