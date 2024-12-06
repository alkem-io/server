import { Injectable } from '@nestjs/common';
import { UpdateCollaborationFromTemplateInput } from './dto/template.applier.dto.update.collaboration';
import { TemplateService } from '../template/template.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';

@Injectable()
export class TemplateApplierService {
  constructor(
    private templateService: TemplateService,
    private collaborationService: CollaborationService
  ) {}

  async updateCollaborationFromTemplate(
    updateData: UpdateCollaborationFromTemplateInput,
    targetCollaboration: ICollaboration,
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
    return this.templateService.updateCollaborationFromCollaboration(
      collaborationFromTemplate,
      targetCollaboration,
      updateData.addCallouts,
      userID
    );
  }
}
