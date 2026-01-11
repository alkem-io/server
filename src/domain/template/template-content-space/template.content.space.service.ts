import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SpaceAboutService } from '@domain/space/space.about/space.about.service';
import { TemplateContentSpace } from './template.content.space.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { CreateTemplateContentSpaceInput } from './dto/template.content.space.dto.create';
import { ITemplateContentSpace } from './template.content.space.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { UpdateTemplateContentSpaceInput } from './dto/template.content.space.dto.update';
import { ISpaceAbout } from '@domain/space/space.about/space.about.interface';
import { ActorContext } from '@core/actor-context';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { LicenseType } from '@common/enums/license.type';
import { CreateSpaceAboutInput } from '@domain/space/space.about';

@Injectable()
export class TemplateContentSpaceService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private spaceAboutService: SpaceAboutService,
    private collaborationService: CollaborationService,
    private licenseService: LicenseService,
    @InjectRepository(TemplateContentSpace)
    private templateContentSpaceRepository: Repository<TemplateContentSpace>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createTemplateContentSpace(
    templateContentSpaceData: CreateTemplateContentSpaceInput,
    storageAggregator: IStorageAggregator,
    actorContext?: ActorContext
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace: ITemplateContentSpace =
      TemplateContentSpace.create(templateContentSpaceData);

    templateContentSpace.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.TEMPLATE_CONTENT_SPACE
    );
    templateContentSpace.subspaces = [];

    templateContentSpace.about = await this.spaceAboutService.createSpaceAbout(
      templateContentSpaceData.about,
      storageAggregator
    );

    //// Collaboration
    templateContentSpaceData.collaborationData.isTemplate = true;
    templateContentSpace.collaboration =
      await this.collaborationService.createCollaboration(
        templateContentSpaceData.collaborationData,
        storageAggregator,
        actorContext
      );

    for (const subspace of templateContentSpaceData.subspaces) {
      const subspaceContent = await this.createTemplateContentSpace(
        subspace,
        storageAggregator,
        actorContext
      );
      templateContentSpace.subspaces.push(subspaceContent);
    }

    return await this.save(templateContentSpace);
  }

  async save(
    templateContentSpace: ITemplateContentSpace
  ): Promise<ITemplateContentSpace> {
    return await this.templateContentSpaceRepository.save(templateContentSpace);
  }

  async deleteTemplateContentSpaceOrFail(
    templateContentSpaceID: string
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace = await this.getTemplateContentSpaceOrFail(
      templateContentSpaceID,
      {
        relations: {
          collaboration: {
            innovationFlow: true,
            timeline: true,
            calloutsSet: true,
          },
          about: {
            profile: true,
          },
          subspaces: {
            collaboration: {
              innovationFlow: true,
              timeline: true,
              calloutsSet: true,
            },
            about: {
              profile: true,
            },
            subspaces: {
              collaboration: {
                innovationFlow: true,
                timeline: true,
                calloutsSet: true,
              },
              about: {
                profile: true,
              },
            },
          },
          authorization: true,
        },
      }
    );

    if (
      !templateContentSpace.authorization ||
      !templateContentSpace.about ||
      !templateContentSpace.collaboration
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to delete TemplateContentSpace: ${templateContentSpace.id} `,
        LogContext.SPACES
      );
    }

    // First, recursively delete all subspaces (including sub-subspaces)
    // This needs to be done before deleting the parent to avoid foreign key constraints
    if (
      templateContentSpace.subspaces &&
      templateContentSpace.subspaces.length > 0
    ) {
      for (const subspace of templateContentSpace.subspaces) {
        await this.deleteTemplateContentSpaceOrFail(subspace.id);
      }
    }

    // Delete collaboration and all its nested entities
    if (templateContentSpace.collaboration) {
      await this.collaborationService.deleteCollaborationOrFail(
        templateContentSpace.collaboration.id
      );
    }

    // Delete space about and its profile
    if (templateContentSpace.about) {
      await this.spaceAboutService.removeSpaceAbout(
        templateContentSpace.about.id
      );
    }

    // Delete authorization policy
    await this.authorizationPolicyService.delete(
      templateContentSpace.authorization
    );

    // Finally, delete the template content space itself
    const result = await this.templateContentSpaceRepository.remove(
      templateContentSpace as TemplateContentSpace
    );
    result.id = templateContentSpaceID;

    return result;
  }

  async getTemplateContentSpaceOrFail(
    templateContentSpaceID: string,
    options?: FindOneOptions<TemplateContentSpace>
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace = await this.getTemplateContentSpace(
      templateContentSpaceID,
      options
    );
    if (!templateContentSpace)
      throw new EntityNotFoundException(
        `Unable to find TemplateContentSpace with ID: ${templateContentSpaceID} using options '${JSON.stringify(
          options
        )}`,
        LogContext.TEMPLATES
      );
    return templateContentSpace;
  }

  async getTemplateContentSpace(
    templateContentSpaceID: string,
    options?: FindOneOptions<TemplateContentSpace>
  ): Promise<ITemplateContentSpace | null> {
    const templateContentSpace =
      await this.templateContentSpaceRepository.findOne({
        where: {
          id: templateContentSpaceID,
        },
        ...options,
      });

    return templateContentSpace;
  }

  public async update(
    templateContentSpaceData: UpdateTemplateContentSpaceInput
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace = await this.getTemplateContentSpaceOrFail(
      templateContentSpaceData.ID,
      {
        relations: {
          about: {
            profile: true,
          },
        },
      }
    );

    if (!templateContentSpace.about) {
      throw new EntityNotInitializedException(
        `TemplateContentSpace not initialized: ${templateContentSpaceData.ID}`,
        LogContext.TEMPLATES
      );
    }

    if (templateContentSpaceData.about) {
      templateContentSpace.about =
        await this.spaceAboutService.updateSpaceAbout(
          templateContentSpace.about,
          templateContentSpaceData.about
        );
    }

    return await this.save(templateContentSpace);
  }

  public async updateAboutFromExistingSpace(
    templateContentSpace: ITemplateContentSpace,
    spaceAbout: CreateSpaceAboutInput,
    storageAggregator: IStorageAggregator
  ): Promise<ITemplateContentSpace> {
    if (!templateContentSpace.about) {
      throw new EntityNotInitializedException(
        'TemplateContentSpace not initialized',
        LogContext.TEMPLATES,
        { templateContentSpaceId: templateContentSpace.id }
      );
    }
    // Delete space about and its profile and create a new one
    await this.spaceAboutService.removeSpaceAbout(
      templateContentSpace.about.id
    );

    templateContentSpace.about = await this.spaceAboutService.createSpaceAbout(
      spaceAbout,
      storageAggregator
    );

    return templateContentSpace;
  }

  public createLicenseTemplateContentSpace(): ILicense {
    return this.licenseService.createLicense({
      type: LicenseType.TEMPLATE_CONTENT_SPACE,
      entitlements: [
        {
          type: LicenseEntitlementType.SPACE_FREE,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_PLUS,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_PREMIUM,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: true,
        },
        {
          type: LicenseEntitlementType.SPACE_FLAG_MEMO_MULTI_USER,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: true,
        },
      ],
    });
  }

  public async getSpaceAbout(
    templateContentSpaceID: string
  ): Promise<ISpaceAbout> {
    const templateContentSpace = await this.getTemplateContentSpaceOrFail(
      templateContentSpaceID,
      {
        relations: { about: true },
      }
    );
    const about = templateContentSpace.about;
    if (!about)
      throw new RelationshipNotFoundException(
        `Unable to load about for TemplateContentSpace ${templateContentSpaceID} `,
        LogContext.TEMPLATES
      );
    return about;
  }

  public async getSubspaces(
    templateContentSpaceID: string
  ): Promise<ITemplateContentSpace[]> {
    const templateContentSpace = await this.getTemplateContentSpaceOrFail(
      templateContentSpaceID,
      {
        relations: { subspaces: true },
      }
    );
    const subspaces = templateContentSpace.subspaces;
    if (!subspaces)
      throw new RelationshipNotFoundException(
        `Unable to load subspaces for TemplateContentSpace ${templateContentSpaceID} `,
        LogContext.TEMPLATES
      );
    return subspaces;
  }
}
