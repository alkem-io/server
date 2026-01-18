import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { CollaborationLicenseService } from '@domain/collaboration/collaboration/collaboration.service.license';
import { ILicense } from '@domain/common/license/license.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateContentSpaceService } from './template.content.space.service';

@Injectable()
export class TemplateContentSpaceLicenseService {
  constructor(
    private templateContentSpaceService: TemplateContentSpaceService,
    private collaborationLicenseService: CollaborationLicenseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyLicensePolicy(
    templateContentSpaceID: string
  ): Promise<ILicense[]> {
    const templateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        templateContentSpaceID,
        {
          relations: {
            collaboration: true,
          },
        }
      );
    if (!templateContentSpace.collaboration) {
      throw new RelationshipNotFoundException(
        `Unable to load TemplateContentSpace with entities at start of license reset: ${templateContentSpace.id} `,
        LogContext.ACCOUNT
      );
    }

    const updatedLicenses: ILicense[] = [];

    // reset to the default license on the collaboration
    // TODO: optimize to not recreate all the time
    const license =
      this.templateContentSpaceService.createLicenseTemplateContentSpace();

    const collaborationLicenses =
      await this.collaborationLicenseService.applyLicensePolicy(
        templateContentSpace.collaboration.id,
        license
      );
    updatedLicenses.push(...collaborationLicenses);

    return updatedLicenses;
  }
}
