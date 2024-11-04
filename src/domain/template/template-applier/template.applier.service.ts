import { Injectable } from '@nestjs/common';
import { UpdateCollaborationFromTemplateInput } from './dto/template.applier.dto.update.collaboration';
import { TemplateService } from '../template/template.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CalloutAuthorizationService } from '@domain/collaboration/callout/callout.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ICallout } from '@domain/collaboration/callout';

@Injectable()
export class TemplateApplierService {
  constructor(
    private templateService: TemplateService,
    private innovationFlowService: InnovationFlowService,
    private collaborationService: CollaborationService,
    private inputCreatorService: InputCreatorService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private namingService: NamingService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  async updateCollaborationFromTemplate(
    updateData: UpdateCollaborationFromTemplateInput,
    targetCollaboration: ICollaboration,
    storageAggregator: IStorageAggregator,
    userID: string
  ): Promise<ICollaboration> {
    const collaborationTemplate = await this.templateService.getCollaboration(
      updateData.collaborationTemplateID
    );
    const collaborationFromTemplate =
      await this.collaborationService.getCollaborationOrFail(
        collaborationTemplate.id,
        {
          relations: {
            innovationFlow: true,
            callouts: true,
          },
        }
      );
    if (
      !collaborationFromTemplate.innovationFlow ||
      !targetCollaboration.innovationFlow ||
      !targetCollaboration.callouts ||
      !targetCollaboration.authorization
    ) {
      throw new RelationshipNotFoundException(
        `Template cannot be applied on uninitialized collaboration templateId:'${collaborationTemplate.id}' TargetCollaboration.id='${targetCollaboration.id}'`,
        LogContext.TEMPLATES
      );
    }
    const newStatesStr = collaborationFromTemplate.innovationFlow.states;
    targetCollaboration.innovationFlow =
      await this.innovationFlowService.updateInnovationFlowStates(
        targetCollaboration.innovationFlow.id,
        newStatesStr
      );

    if (updateData.addCallouts) {
      const calloutsFromTemplate =
        await this.inputCreatorService.buildCreateCalloutInputsFromCallouts(
          collaborationFromTemplate.callouts ?? []
        );

      const newCallouts = await this.collaborationService.addCallouts(
        targetCollaboration,
        calloutsFromTemplate,
        storageAggregator,
        userID
      );
      targetCollaboration.callouts?.push(...newCallouts);
      this.ensureCalloutsInValidGroupsAndStates(targetCollaboration);

      // Need to save before applying authorization policy to get the callout ids
      const result = await this.collaborationService.save(targetCollaboration);

      await this.applyAuthorizationPolicyToNewCallouts(
        targetCollaboration,
        newCallouts
      );

      return result;
    } else {
      this.ensureCalloutsInValidGroupsAndStates(targetCollaboration);
      return await this.collaborationService.save(targetCollaboration);
    }
  }
  private ensureCalloutsInValidGroupsAndStates(
    targetCollaboration: ICollaboration
  ) {
    // We don't have callouts or we don't have innovationFlow, can't do anything
    if (!targetCollaboration.innovationFlow || !targetCollaboration.callouts) {
      throw new RelationshipNotFoundException(
        `Unable to load Callouts or InnovationFlow ${targetCollaboration.id} `,
        LogContext.TEMPLATES
      );
    }

    const validGroupNames =
      targetCollaboration.tagsetTemplateSet?.tagsetTemplates.find(
        tagset => tagset.name === TagsetReservedName.CALLOUT_GROUP
      )?.allowedValues;
    const validFlowStates = this.innovationFlowService
      .getStates(targetCollaboration.innovationFlow)
      ?.map(state => state.displayName);

    this.collaborationService.moveCalloutsToDefaultGroupAndState(
      validGroupNames ?? [],
      validFlowStates ?? [],
      targetCollaboration.callouts
    );
  }
  private async applyAuthorizationPolicyToNewCallouts(
    targetCollaboration: ICollaboration,
    newCallouts: ICallout[]
  ): Promise<unknown> {
    const authorizations: IAuthorizationPolicy[] = [];

    const { roleSet: communityPolicy, spaceSettings } =
      await this.namingService.getRoleSetAndSettingsForCollaboration(
        targetCollaboration.id
      );

    for (const callout of newCallouts) {
      const calloutAuthorizations =
        await this.calloutAuthorizationService.applyAuthorizationPolicy(
          callout.id,
          targetCollaboration.authorization,
          communityPolicy,
          spaceSettings
        );
      authorizations.push(...calloutAuthorizations);
    }
    return await this.authorizationPolicyService.saveAll(authorizations);
  }
}
