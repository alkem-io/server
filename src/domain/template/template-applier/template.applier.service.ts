import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { introducesCollaboraDocument } from '@domain/collaboration/callout/callout.collabora.gate.util';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { CollaborationLicenseService } from '@domain/collaboration/collaboration/collaboration.service.license';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { CreateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-state/dto/innovation.flow.state.dto.create';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateService } from '../template/template.service';
import { ITemplateContentSpace } from '../template-content-space/template.content.space.interface';
import { UpdateCollaborationFromSpaceTemplateInput } from './dto/template.applier.dto.update.collaboration';

@Injectable()
export class TemplateApplierService {
  constructor(
    private readonly templateService: TemplateService,
    private readonly innovationFlowService: InnovationFlowService,
    private readonly calloutsSetService: CalloutsSetService,
    private readonly calloutService: CalloutService,
    private readonly inputCreatorService: InputCreatorService,
    private readonly storageAggregatorResolverService: StorageAggregatorResolverService,
    private readonly collaborationService: CollaborationService,
    private readonly collaborationLicenseService: CollaborationLicenseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async updateCollaborationFromSpaceTemplate(
    updateData: UpdateCollaborationFromSpaceTemplateInput,
    targetCollaboration: ICollaboration,
    userID: string
  ): Promise<ICollaboration> {
    const templateWithContentSpace =
      await this.templateService.getTemplateOrFail(updateData.spaceTemplateID, {
        relations: {
          contentSpace: {
            collaboration: {
              innovationFlow: {
                states: true,
              },
              calloutsSet: {
                callouts: true,
              },
            },
          },
        },
      });
    if (!templateWithContentSpace.contentSpace?.collaboration) {
      throw new RelationshipNotFoundException(
        `Template with ID ${updateData.spaceTemplateID} does not have a Space associated.`,
        LogContext.TEMPLATES
      );
    }

    // Office Docs entitlement gate (FR-001/FR-004/FR-005/FR-009): pre-flight scan
    // before any persistence. If the source template introduces a Collabora Document
    // (framing or contribution-allowed) into the target Collaboration and the target
    // is unentitled, the entire apply MUST be rejected atomically (FR-005, SC-006).
    const templateCallouts =
      templateWithContentSpace.contentSpace.collaboration?.calloutsSet
        ?.callouts ?? [];
    if (
      updateData.addCallouts &&
      templateCallouts.some(callout => introducesCollaboraDocument(callout))
    ) {
      await this.collaborationLicenseService.ensureOfficeDocsAllowedForCollaboration(
        targetCollaboration.id
      );
    }

    return this.updateCollaborationFromTemplateContentSpace(
      targetCollaboration,
      templateWithContentSpace.contentSpace,
      updateData.addCallouts,
      updateData.deleteExistingCallouts,
      userID
    );
  }

  private async updateCollaborationFromTemplateContentSpace(
    targetCollaboration: ICollaboration,
    templateContentSpace: ITemplateContentSpace,
    addCallouts: boolean,
    deleteExistingCallouts: boolean,
    userID: string
  ): Promise<ICollaboration> {
    const sourceCollaboration = templateContentSpace.collaboration;
    if (
      !targetCollaboration?.innovationFlow ||
      !targetCollaboration.calloutsSet?.callouts ||
      !sourceCollaboration?.innovationFlow ||
      !sourceCollaboration?.calloutsSet?.callouts
    ) {
      throw new RelationshipNotFoundException(
        `Template cannot be applied on entities not fully loaded space.id:'${targetCollaboration.id}' templateContentSpace.id='${templateContentSpace.id}'`,
        LogContext.TEMPLATES
      );
    }

    // Delete existing callouts if requested (before updating flow states)
    if (deleteExistingCallouts && targetCollaboration.calloutsSet?.callouts) {
      const existingCallouts = targetCollaboration.calloutsSet.callouts;
      this.logger.verbose?.(
        `Deleting ${existingCallouts.length} existing callouts from collaboration`,
        LogContext.TEMPLATES
      );

      for (const callout of existingCallouts) {
        await this.calloutService.deleteCallout(callout.id);
      }

      targetCollaboration.calloutsSet.callouts = [];

      this.logger.verbose?.(
        'Successfully deleted existing callouts',
        LogContext.TEMPLATES
      );
    }

    const newStates = sourceCollaboration.innovationFlow.states;
    const newStatesInput: CreateInnovationFlowStateInput[] =
      this.inputCreatorService.buildCreateInnovationFlowStateInputFromInnovationFlowState(
        newStates
      );
    targetCollaboration.innovationFlow =
      await this.innovationFlowService.updateInnovationFlowStates(
        targetCollaboration.innovationFlow,
        newStatesInput
      );

    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCollaboration(
        targetCollaboration.id
      );
    if (addCallouts) {
      const calloutsFromSourceCollaboration =
        await this.inputCreatorService.buildCreateCalloutInputsFromCallouts(
          sourceCollaboration.calloutsSet.callouts ?? []
        );

      const newCallouts = await this.calloutsSetService.addCallouts(
        targetCollaboration.calloutsSet,
        calloutsFromSourceCollaboration,
        storageAggregator,
        userID
      );
      targetCollaboration.calloutsSet.callouts?.push(...newCallouts);
    }

    this.templateService.ensureCalloutsInValidGroupsAndStates(
      targetCollaboration
    );

    // Need to save before applying authorization policy to get the callout ids
    return await this.collaborationService.save(targetCollaboration);
  }
}
