import { Injectable } from '@nestjs/common';
import { UpdateCollaborationFromTemplateInput } from './dto/template.applier.dto.update.collaboration';
import { TemplateService } from '../template/template.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';

@Injectable()
export class TemplateApplierService {
  constructor(
    private templateService: TemplateService,
    private innovationFlowService: InnovationFlowService,
    private collaborationService: CollaborationService
  ) {}

  async updateCollaborationFromTemplate(
    updateData: UpdateCollaborationFromTemplateInput,
    targetCollaboration: ICollaboration
  ): Promise<ICollaboration> {
    const collaborationFromTemplate =
      await this.templateService.getCollaboration(
        updateData.collaborationTemplateID
      );
    const collaborationFromTemplateWithInnovationFlow =
      await this.collaborationService.getCollaborationOrFail(
        collaborationFromTemplate.id,
        {
          relations: {
            innovationFlow: true,
          },
        }
      );
    if (
      !collaborationFromTemplateWithInnovationFlow.innovationFlow ||
      !targetCollaboration.innovationFlow
    ) {
      throw new RelationshipNotFoundException(
        `InnovationFlow not found for collaboration ${collaborationFromTemplate.id}`,
        LogContext.TEMPLATES
      );
    }
    const newStatesStr =
      collaborationFromTemplateWithInnovationFlow.innovationFlow.states;
    targetCollaboration.innovationFlow =
      await this.innovationFlowService.updateInnovationFlowStates(
        targetCollaboration.innovationFlow.id,
        newStatesStr
      );
    return await this.collaborationService.save(targetCollaboration);
  }
}
