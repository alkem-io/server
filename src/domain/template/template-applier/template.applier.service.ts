import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { CreateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-state/dto/innovation.flow.state.dto.create';
import { Injectable } from '@nestjs/common';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { TemplateService } from '../template/template.service';
import { ITemplateContentSpace } from '../template-content-space/template.content.space.interface';
import { UpdateCollaborationFromSpaceTemplateInput } from './dto/template.applier.dto.update.collaboration';

@Injectable()
export class TemplateApplierService {
  constructor(
    private templateService: TemplateService,
    private innovationFlowService: InnovationFlowService,
    private calloutsSetService: CalloutsSetService,
    private readonly inputCreatorService: InputCreatorService,
    private readonly storageAggregatorResolverService: StorageAggregatorResolverService,
    private readonly collaborationService: CollaborationService
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
    if (
      !templateWithContentSpace.contentSpace ||
      !templateWithContentSpace.contentSpace.collaboration
    ) {
      throw new RelationshipNotFoundException(
        `Template with ID ${updateData.spaceTemplateID} does not have a Space associated.`,
        LogContext.TEMPLATES
      );
    }

    return this.updateCollaborationFromTemplateContentSpace(
      targetCollaboration,
      templateWithContentSpace.contentSpace,
      updateData.addCallouts,
      userID
    );
  }

  private async updateCollaborationFromTemplateContentSpace(
    targetCollaboration: ICollaboration,
    templateContentSpace: ITemplateContentSpace,
    addCallouts: boolean,
    userID: string
  ): Promise<ICollaboration> {
    const sourceCollaboration = templateContentSpace.collaboration;
    if (
      !targetCollaboration ||
      !targetCollaboration.innovationFlow ||
      !targetCollaboration.calloutsSet?.callouts ||
      !sourceCollaboration?.innovationFlow ||
      !sourceCollaboration?.calloutsSet?.callouts
    ) {
      throw new RelationshipNotFoundException(
        `Template cannot be applied on entities not fully loaded space.id:'${targetCollaboration.id}' templateContentSpace.id='${templateContentSpace.id}'`,
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
