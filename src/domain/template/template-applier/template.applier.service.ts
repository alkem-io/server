import { Injectable } from '@nestjs/common';
import { UpdateCollaborationFromSpaceTemplateInput } from './dto/template.applier.dto.update.collaboration';
import { TemplateService } from '../template/template.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

@Injectable()
export class TemplateApplierService {
  constructor(private templateService: TemplateService) {}

  async updateCollaborationFromSpaceTemplate(
    updateData: UpdateCollaborationFromSpaceTemplateInput,
    targetCollaboration: ICollaboration,
    userID: string
  ): Promise<ICollaboration> {
    const templateWithContentSpace =
      await this.templateService.getTemplateOrFail(updateData.spaceTemplateID, {
        relations: {
          space: {
            collaboration: true,
          },
        },
      });
    if (
      !templateWithContentSpace.space ||
      !templateWithContentSpace.space.collaboration
    ) {
      throw new RelationshipNotFoundException(
        `Template with ID ${updateData.spaceTemplateID} does not have a Space associated.`,
        LogContext.TEMPLATES
      );
    }

    return this.templateService.updateCollaborationFromTemplateContentSpace(
      targetCollaboration,
      templateWithContentSpace.space,
      updateData.addCallouts,
      userID
    );
  }
}
