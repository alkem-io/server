import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IAgent } from '@domain/agent/agent';
import {
  CreateTemplateContentSpaceInput,
  DeleteTemplateContentSpaceInput,
} from '@domain/templateContentSpace/templateContentSpace';
import { ICommunity } from '@domain/community/community';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, In, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateContentSpace } from './templateContentSpace.entity';
import { ITemplateContentSpace } from './templateContentSpace.interface';
import { UpdateTemplateContentSpaceInput } from './dto/templateContentSpace.dto.update';
import { CreateSubtemplateContentSpaceInput } from './dto/templateContentSpace.dto.create.subtemplateContentSpace';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { TemplateContentSpacesQueryArgs } from './dto/templateContentSpace.args.query.templateContentSpaces';
import { TemplateContentSpaceVisibility } from '@common/enums/templateContentSpace.visibility';
import { TemplateContentSpaceFilterService } from '@services/infrastructure/templateContentSpace-filter/templateContentSpace.filter.service';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { InnovationHub, InnovationHubType } from '@domain/innovation-hub/types';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { TemplateContentSpaceFilterInput } from '@services/infrastructure/templateContentSpace-filter/dto/templateContentSpace.filter.dto.input';
import { PaginationArgs } from '@core/pagination';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { UpdateTemplateContentSpacePlatformSettingsInput } from './dto/templateContentSpace.dto.update.platform.settings';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CommunityService } from '@domain/community/community/community.service';
import { CreateCommunityInput } from '@domain/community/community/dto/community.dto.create';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { TemplateContentSpaceDefaultsService } from '../templateContentSpace.defaults/templateContentSpace.defaults.service';
import { TemplateContentSpaceSettingsService } from '../templateContentSpace.settings/templateContentSpace.settings.service';
import { UpdateTemplateContentSpaceSettingsEntityInput } from '../templateContentSpace.settings/dto/templateContentSpace.settings.dto.update';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoleName } from '@common/enums/role.name';
import { TemplateContentSpaceLevel } from '@common/enums/templateContentSpace.level';
import { UpdateTemplateContentSpaceSettingsInput } from './dto/templateContentSpace.dto.update.settings';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { AgentType } from '@common/enums/agent.type';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { ITemplateContentSpaceSubscription } from './templateContentSpace.license.subscription.interface';
import { IAccount } from '../account/account.interface';
import { LicensingCredentialBasedPlanType } from '@common/enums/licensing.credential.based.plan.type';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { ITemplatesManager } from '@domain/template/templates-manager';
import { Activity } from '@platform/activity';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseService } from '@domain/common/license/license.service';
import { LicenseType } from '@common/enums/license.type';
import { getDiff, hasOnlyAllowedFields } from '@common/utils';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { TemplateContentSpacePrivacyMode } from '@common/enums/templateContentSpace.privacy.mode';
import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';
import { RoleSetType } from '@common/enums/role.set.type';
import { ITemplateContentSpaceAbout } from '../templateContentSpace.about/templateContentSpace.about.interface';
import { TemplateContentSpaceAboutService } from '../templateContentSpace.about/templateContentSpace.about.service';
import { ILicense } from '@domain/common/license/license.interface';

const EXPLORE_SPACES_LIMIT = 30;
const EXPLORE_SPACES_ACTIVITY_DAYS_OLD = 30;

type TemplateContentSpaceSortingData = {
  id: string;
  subtemplateContentSpacesCount: number;
  visibility: TemplateContentSpaceVisibility;
  accessModeIsPublic: boolean;
};

@Injectable()
export class TemplateContentSpaceService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templateContentSpacesFilterService: TemplateContentSpaceFilterService,
    private templateContentSpaceAboutService: TemplateContentSpaceAboutService,
    private agentService: AgentService,
    private communityService: CommunityService,
    private roleSetService: RoleSetService,
    private namingService: NamingService,
    private templateContentSpaceSettingsService: TemplateContentSpaceSettingsService,
    private templateContentSpaceDefaultsService: TemplateContentSpaceDefaultsService,
    private storageAggregatorService: StorageAggregatorService,
    private collaborationService: CollaborationService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licenseService: LicenseService,
    @InjectRepository(TemplateContentSpace)
    private templateContentSpaceRepository: Repository<TemplateContentSpace>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createTemplateContentSpace(
    templateContentSpaceData: CreateTemplateContentSpaceInput,
    agentInfo?: AgentInfo
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace: ITemplateContentSpace =
      TemplateContentSpace.create(templateContentSpaceData);
    // default to demo templateContentSpace
    templateContentSpace.visibility = TemplateContentSpaceVisibility.ACTIVE;

    templateContentSpace.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.SPACE
    );
    templateContentSpace.settings =
      this.templateContentSpaceDefaultsService.getDefaultTemplateContentSpaceSettings(
        templateContentSpace.level
      );

    const storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.SPACE,
        templateContentSpaceData.storageAggregatorParent
      );
    templateContentSpace.storageAggregator = storageAggregator;

    templateContentSpace.license =
      this.createLicenseForTemplateContentSpaceL0();

    const roleSetRolesData =
      this.templateContentSpaceDefaultsService.getRoleSetCommunityRoles(
        templateContentSpace.level
      );
    const applicationFormData =
      this.templateContentSpaceDefaultsService.getRoleSetCommunityApplicationForm(
        templateContentSpace.level
      );

    const communityData: CreateCommunityInput = {
      name: templateContentSpaceData.about.profileData.displayName,
      roleSetData: {
        roles: roleSetRolesData,
        applicationForm: applicationFormData,
        entryRoleName: RoleName.MEMBER,
        type: RoleSetType.SPACE,
      },
    };

    templateContentSpace.community =
      await this.communityService.createCommunity(communityData);

    templateContentSpace.about =
      await this.templateContentSpaceAboutService.createTemplateContentSpaceAbout(
        templateContentSpaceData.about,
        storageAggregator
      );

    templateContentSpace.levelZeroTemplateContentSpaceID = '';
    // save the collaboration and all it's template sets
    await this.save(templateContentSpace);

    if (templateContentSpaceData.level === TemplateContentSpaceLevel.L0) {
      templateContentSpace.levelZeroTemplateContentSpaceID =
        templateContentSpace.id;
    }

    //// Collaboration
    let collaborationData: CreateCollaborationInput =
      templateContentSpaceData.collaborationData;
    collaborationData.isTemplate = false;
    // Pick up the default template that is applicable
    collaborationData =
      await this.templateContentSpaceDefaultsService.createCollaborationInput(
        collaborationData,
        templateContentSpace.level,
        templateContentSpaceData.platformTemplate,
        templateContentSpaceData.templatesManagerParent
      );
    templateContentSpace.collaboration =
      await this.collaborationService.createCollaboration(
        collaborationData,
        templateContentSpace.storageAggregator,
        agentInfo
      );

    templateContentSpace.agent = await this.agentService.createAgent({
      type: AgentType.SPACE,
    });

    // Community:
    // set immediate community parent + resourceID
    if (
      !templateContentSpace.community ||
      !templateContentSpace.community.roleSet
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Community with RoleSet: ${templateContentSpace.id}`,
        LogContext.SPACES
      );
    }
    templateContentSpace.community.parentID = templateContentSpace.id;
    templateContentSpace.community.roleSet =
      await this.roleSetService.updateRoleResourceID(
        templateContentSpace.community.roleSet,
        templateContentSpace.id
      );

    return await this.save(templateContentSpace);
  }

  public createLicenseForTemplateContentSpaceL0(): ILicense {
    return this.licenseService.createLicense({
      type: LicenseType.SPACE,
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
      ],
    });
  }

  async save(
    templateContentSpace: ITemplateContentSpace
  ): Promise<ITemplateContentSpace> {
    return await this.templateContentSpaceRepository.save(templateContentSpace);
  }

  async deleteTemplateContentSpaceOrFail(
    deleteData: DeleteTemplateContentSpaceInput
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace = await this.getTemplateContentSpaceOrFail(
      deleteData.ID,
      {
        relations: {
          subtemplateContentSpaces: true,
          collaboration: true,
          community: true,
          about: true,
          agent: true,
          storageAggregator: true,
          license: true,
        },
      }
    );

    if (
      !templateContentSpace.subtemplateContentSpaces ||
      !templateContentSpace.collaboration ||
      !templateContentSpace.community ||
      !templateContentSpace.about ||
      !templateContentSpace.agent ||
      !templateContentSpace.storageAggregator ||
      !templateContentSpace.authorization ||
      !templateContentSpace.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to delete TemplateContentSpace: ${templateContentSpace.id} `,
        LogContext.SPACES
      );
    }

    // Do not remove a templateContentSpace that has subtemplateContentSpaces, require these to be individually first removed
    if (templateContentSpace.subtemplateContentSpaces.length > 0) {
      throw new OperationNotAllowedException(
        `Unable to remove TemplateContentSpace (${templateContentSpace.id}), with level ${templateContentSpace.level}, as it contains ${templateContentSpace.subtemplateContentSpaces.length} subtemplateContentSpaces`,
        LogContext.SPACES
      );
    }

    await this.templateContentSpaceAboutService.removeTemplateContentSpaceAbout(
      templateContentSpace.about.id
    );
    await this.collaborationService.deleteCollaborationOrFail(
      templateContentSpace.collaboration.id
    );
    await this.communityService.removeCommunityOrFail(
      templateContentSpace.community.id
    );
    await this.agentService.deleteAgent(templateContentSpace.agent.id);
    await this.licenseService.removeLicenseOrFail(
      templateContentSpace.license.id
    );
    await this.authorizationPolicyService.delete(
      templateContentSpace.authorization
    );

    if (templateContentSpace.level === TemplateContentSpaceLevel.L0) {
      if (
        !templateContentSpace.templatesManager ||
        !templateContentSpace.templatesManager
      ) {
        throw new RelationshipNotFoundException(
          `Unable to load entities to delete base subtemplateContentSpace: ${templateContentSpace.id} `,
          LogContext.SPACES
        );
      }
      await this.templatesManagerService.deleteTemplatesManager(
        templateContentSpace.templatesManager.id
      );
    }

    await this.storageAggregatorService.delete(
      templateContentSpace.storageAggregator.id
    );

    const result = await this.templateContentSpaceRepository.remove(
      templateContentSpace as TemplateContentSpace
    );
    result.id = deleteData.ID;
    return result;
  }

  /**
   * Retrieves templateContentSpaces for a given innovation hub.
   * @throws {EntityNotInitializedException} if a filter is not defined.
   * @throws {NotSupportedException} if the innovation hub type is not supported.
   */
  public async getTemplateContentSpacesForInnovationHub({
    id,
    type,
    templateContentSpaceListFilter,
    templateContentSpaceVisibilityFilter,
  }: InnovationHub): Promise<TemplateContentSpace[]> {
    if (type === InnovationHubType.VISIBILITY) {
      if (!templateContentSpaceVisibilityFilter) {
        throw new EntityNotInitializedException(
          `'templateContentSpaceVisibilityFilter' of Innovation Hub '${id}' not defined`,
          LogContext.INNOVATION_HUB
        );
      }

      return this.templateContentSpaceRepository.findBy({
        visibility: templateContentSpaceVisibilityFilter,
        level: TemplateContentSpaceLevel.L0,
      });
    }

    if (type === InnovationHubType.LIST) {
      if (!templateContentSpaceListFilter) {
        throw new EntityNotInitializedException(
          `'templateContentSpaceListFilter' of Innovation Hub '${id}' not defined`,
          LogContext.INNOVATION_HUB
        );
      }

      const unsortedTemplateContentSpaces =
        await this.templateContentSpaceRepository.findBy([
          { id: In(templateContentSpaceListFilter) },
        ]);
      // sort according to the order of the templateContentSpace list filter
      return unsortedTemplateContentSpaces.sort(
        (a, b) =>
          templateContentSpaceListFilter.indexOf(a.id) -
          templateContentSpaceListFilter.indexOf(b.id)
      );
    }

    throw new NotSupportedException(
      `Unsupported Innovation Hub type: '${type}'`,
      LogContext.INNOVATION_HUB
    );
  }

  async getTemplateContentSpacesSorted(
    args: TemplateContentSpacesQueryArgs,
    options?: FindManyOptions<TemplateContentSpace>
  ): Promise<ITemplateContentSpace[]> {
    const templateContentSpaces = await this.getTemplateContentSpacesUnsorted(
      args,
      options
    );

    if (templateContentSpaces.length === 0) return templateContentSpaces;

    return await this.orderTemplateContentSpacesDefault(templateContentSpaces);
  }

  async getTemplateContentSpacesUnsorted(
    args: TemplateContentSpacesQueryArgs,
    options?: FindManyOptions<TemplateContentSpace>
  ): Promise<ITemplateContentSpace[]> {
    const visibilities =
      this.templateContentSpacesFilterService.getAllowedVisibilities(
        args.filter
      );
    // Load the templateContentSpaces
    let templateContentSpaces: ITemplateContentSpace[];
    if (args && args.IDs) {
      templateContentSpaces = await this.templateContentSpaceRepository.find({
        where: {
          id: In(args.IDs),
          level: TemplateContentSpaceLevel.L0,
          visibility: In(visibilities),
        },
        ...options,
      });
    } else {
      templateContentSpaces = await this.templateContentSpaceRepository.find({
        where: {
          visibility: In(visibilities),
          level: TemplateContentSpaceLevel.L0,
        },
        ...options,
      });
    }

    if (templateContentSpaces.length === 0) return [];

    return templateContentSpaces;
  }

  public async getTemplateContentSpacesInList(
    templateContentSpaceIDs: string[]
  ): Promise<ITemplateContentSpace[]> {
    const visibilities = [
      TemplateContentSpaceVisibility.ACTIVE,
      TemplateContentSpaceVisibility.DEMO,
    ];

    const templateContentSpaces =
      await this.templateContentSpaceRepository.find({
        where: {
          id: In(templateContentSpaceIDs),
          visibility: In(visibilities),
        },
        relations: {
          parentTemplateContentSpace: true,
          collaboration: true,
        },
      });

    if (templateContentSpaces.length === 0) return [];

    return templateContentSpaces;
  }

  public async orderTemplateContentSpacesDefault(
    templateContentSpaces: ITemplateContentSpace[]
  ): Promise<ITemplateContentSpace[]> {
    // Get the order to return the data in
    const sortedIDs = await this.getTemplateContentSpacesWithSortOrderDefault(
      templateContentSpaces.flatMap(x => x.id)
    );
    const templateContentSpacesResult: ITemplateContentSpace[] = [];
    for (const templateContentSpaceID of sortedIDs) {
      const templateContentSpace = templateContentSpaces.find(
        templateContentSpace =>
          templateContentSpace.id === templateContentSpaceID
      );
      if (templateContentSpace) {
        templateContentSpacesResult.push(templateContentSpace);
      } else {
        this.logger.error(
          'Invalid state error when sorting TemplateContentSpaces!',
          undefined,
          LogContext.SPACES
        );
      }
    }
    return templateContentSpacesResult;
  }

  getPaginatedTemplateContentSpaces(
    paginationArgs: PaginationArgs,
    filter?: TemplateContentSpaceFilterInput
  ): Promise<IPaginatedType<ITemplateContentSpace>> {
    const visibilities =
      this.templateContentSpacesFilterService.getAllowedVisibilities(filter);

    const qb = this.templateContentSpaceRepository.createQueryBuilder(
      'templateContentSpace'
    );
    if (visibilities) {
      qb.leftJoinAndSelect(
        'templateContentSpace.authorization',
        'authorization'
      );
      qb.where({
        level: TemplateContentSpaceLevel.L0,
        visibility: In(visibilities),
      });
    }

    return getPaginationResults(qb, paginationArgs);
  }

  private async getTemplateContentSpacesWithSortOrderDefault(
    IDs: string[]
  ): Promise<string[]> {
    // Then load data to do the sorting
    const qb = this.templateContentSpaceRepository.createQueryBuilder(
      'templateContentSpace'
    );

    qb.leftJoinAndSelect(
      'templateContentSpace.subtemplateContentSpaces',
      'subtemplateContentSpace'
    );
    qb.leftJoinAndSelect(
      'templateContentSpace.authorization',
      'authorization_policy'
    );
    qb.leftJoinAndSelect(
      'subtemplateContentSpace.subtemplateContentSpaces',
      'subtemplateContentSpaces'
    );
    qb.where({
      level: TemplateContentSpaceLevel.L0,
      id: In(IDs),
    });
    const templateContentSpacesDataForSorting = await qb.getMany();

    return this.sortTemplateContentSpacesDefault(
      templateContentSpacesDataForSorting
    );
  }

  private sortTemplateContentSpacesDefault(
    templateContentSpacesData: TemplateContentSpace[]
  ): string[] {
    const templateContentSpacesDataForSorting: TemplateContentSpaceSortingData[] =
      [];
    for (const templateContentSpace of templateContentSpacesData) {
      const settings = templateContentSpace.settings;
      let subtemplateContentSpacesCount = 0;
      if (templateContentSpace.subtemplateContentSpaces) {
        subtemplateContentSpacesCount =
          this.getSubtemplateContentSpaceAndSubsubtemplateContentSpacesCount(
            templateContentSpace.subtemplateContentSpaces
          );
      }
      const templateContentSpaceSortingData: TemplateContentSpaceSortingData = {
        id: templateContentSpace.id,
        visibility: templateContentSpace.visibility,
        accessModeIsPublic:
          settings.privacy.mode === TemplateContentSpacePrivacyMode.PUBLIC,
        subtemplateContentSpacesCount,
      };
      templateContentSpacesDataForSorting.push(templateContentSpaceSortingData);
    }
    const sortedTemplateContentSpaces =
      templateContentSpacesDataForSorting.sort((a, b) => {
        if (
          a.visibility !== b.visibility &&
          (a.visibility === TemplateContentSpaceVisibility.DEMO ||
            b.visibility === TemplateContentSpaceVisibility.DEMO)
        )
          return a.visibility === TemplateContentSpaceVisibility.DEMO ? 1 : -1;

        if (a.accessModeIsPublic && !b.accessModeIsPublic) return -1;
        if (!a.accessModeIsPublic && b.accessModeIsPublic) return 1;

        if (a.subtemplateContentSpacesCount > b.subtemplateContentSpacesCount)
          return -1;
        if (a.subtemplateContentSpacesCount < b.subtemplateContentSpacesCount)
          return 1;

        return 0;
      });
    const sortedIDs: string[] = [];
    for (const templateContentSpace of sortedTemplateContentSpaces) {
      sortedIDs.push(templateContentSpace.id);
    }
    return sortedIDs;
  }

  private getSubtemplateContentSpaceAndSubsubtemplateContentSpacesCount(
    subtemplateContentSpaces: ITemplateContentSpace[]
  ): number {
    let subtemplateContentSpacesCount = 0;
    for (const subtemplateContentSpace of subtemplateContentSpaces) {
      subtemplateContentSpacesCount++;

      if (subtemplateContentSpace.subtemplateContentSpaces)
        subtemplateContentSpacesCount +=
          subtemplateContentSpace.subtemplateContentSpaces.length;
    }
    return subtemplateContentSpacesCount;
  }

  public getTemplateContentSpacesByVisibilities(
    templateContentSpaceIds: string[],
    visibilities: TemplateContentSpaceVisibility[] = []
  ) {
    return this.templateContentSpaceRepository.find({
      where: {
        id: In(templateContentSpaceIds),
        visibility: visibilities.length ? In(visibilities) : undefined,
      },
    });
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
        LogContext.SPACES
      );
    return templateContentSpace;
  }

  public getExploreTemplateContentSpaces(
    limit = EXPLORE_SPACES_LIMIT,
    daysOld = EXPLORE_SPACES_ACTIVITY_DAYS_OLD
  ): Promise<ITemplateContentSpace[]> {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - daysOld);

    return (
      this.templateContentSpaceRepository
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.authorization', 'authorization') // eager load the authorization
        .innerJoin(Activity, 'a', 's.collaborationId = a.collaborationID')
        .where({
          level: TemplateContentSpaceLevel.L0,
          visibility: TemplateContentSpaceVisibility.ACTIVE,
        })
        // activities in the past "daysOld" days
        .andWhere('a.createdDate >= :daysAgo', { daysAgo })
        .groupBy('s.id')
        .orderBy('COUNT(a.id)', 'DESC')
        .limit(limit)
        .getMany()
    );
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

  public async getTemplateContentSpaceByNameIdOrFail(
    templateContentSpaceNameID: string,
    options?: FindOneOptions<TemplateContentSpace>
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace =
      await this.templateContentSpaceRepository.findOne({
        where: {
          nameID: templateContentSpaceNameID,
          level: TemplateContentSpaceLevel.L0,
        },
        ...options,
      });
    if (!templateContentSpace) {
      if (!templateContentSpace)
        throw new EntityNotFoundException(
          `Unable to find L0 TemplateContentSpace with nameID: ${templateContentSpaceNameID}`,
          LogContext.SPACES
        );
    }
    return templateContentSpace;
  }

  public async getAllTemplateContentSpaces(
    options?: FindManyOptions<ITemplateContentSpace>
  ): Promise<ITemplateContentSpace[]> {
    return this.templateContentSpaceRepository.find(options);
  }

  public async updateTemplateContentSpacePlatformSettings(
    templateContentSpace: ITemplateContentSpace,
    updateData: UpdateTemplateContentSpacePlatformSettingsInput
  ): Promise<ITemplateContentSpace> {
    if (
      updateData.visibility &&
      updateData.visibility !== templateContentSpace.visibility
    ) {
      // Only update visibility on L0 templateContentSpaces
      if (templateContentSpace.level !== TemplateContentSpaceLevel.L0) {
        throw new ValidationException(
          `Unable to update visibility on TemplateContentSpace ${templateContentSpace.id} as it is not a L0 templateContentSpace`,
          LogContext.SPACES
        );
      }
      await this.updateTemplateContentSpaceVisibilityAllSubtemplateContentSpaces(
        templateContentSpace.id,
        updateData.visibility
      );

      templateContentSpace.visibility = updateData.visibility;
    }

    if (
      updateData.nameID &&
      updateData.nameID !== templateContentSpace.nameID
    ) {
      let reservedNameIDs: string[] = [];
      if (templateContentSpace.level === TemplateContentSpaceLevel.L0) {
        reservedNameIDs =
          await this.namingService.getReservedNameIDsLevelZeroTemplateContentSpaces();
      } else {
        reservedNameIDs =
          await this.namingService.getReservedNameIDsInLevelZeroTemplateContentSpace(
            templateContentSpace.levelZeroTemplateContentSpaceID
          );
      }
      // updating the nameID, check new value is allowed
      const existingNameID = reservedNameIDs.includes(updateData.nameID);
      if (existingNameID) {
        throw new ValidationException(
          `Unable to update TemplateContentSpace nameID: the provided nameID is already taken: ${updateData.nameID}`,
          LogContext.ACCOUNT
        );
      }
      templateContentSpace.nameID = updateData.nameID;
    }

    return await this.save(templateContentSpace);
  }

  private async updateTemplateContentSpaceVisibilityAllSubtemplateContentSpaces(
    levelZeroTemplateContentSpaceID: string,
    visibility: TemplateContentSpaceVisibility
  ) {
    const templateContentSpaces =
      await this.templateContentSpaceRepository.find({
        where: {
          levelZeroTemplateContentSpaceID: levelZeroTemplateContentSpaceID,
        },
      });
    for (const templateContentSpace of templateContentSpaces) {
      templateContentSpace.visibility = visibility;
      await this.save(templateContentSpace);
    }
  }

  public async updateTemplateContentSpaceSettings(
    templateContentSpace: ITemplateContentSpace,
    settingsData: UpdateTemplateContentSpaceSettingsInput
  ): Promise<ITemplateContentSpace> {
    return await this.updateSettings(
      templateContentSpace,
      settingsData.settings
    );
  }

  /**
   * Should the authorization policy be updated based on the update settings.
   * Some setting do not require an update to the authorization policy.
   * @param templateContentSpaceId
   * @param settingsData
   */
  public async shouldUpdateAuthorizationPolicy(
    templateContentSpaceId: string,
    settingsData: UpdateTemplateContentSpaceSettingsEntityInput
  ): Promise<boolean> {
    const templateContentSpace =
      await this.templateContentSpaceRepository.findOneOrFail({
        where: { id: templateContentSpaceId },
        select: {
          id: true,
          settings: {
            collaboration: {
              allowEventsFromSubtemplateContentSpaces: true,
              allowMembersToCreateCallouts: true,
              allowMembersToCreateSubtemplateContentSpaces: true,
              inheritMembershipRights: true,
            },
            membership: {
              allowSubtemplateContentSpaceAdminsToInviteMembers: true,
              policy: true,
            },
            privacy: { allowPlatformSupportAsAdmin: true, mode: true },
          },
        },
      });

    const originalSettings = templateContentSpace.settings;
    // compare the new values from the incoming update request with the original settings
    const difference = getDiff(settingsData, originalSettings);
    // if there is no difference, then no need to update the authorization policy
    if (difference === null) {
      return false;
    }
    // if a difference was detected, check if the difference is in the allowed fields
    // if another field was updated, outside the allowed list, the auth policy has to be updated
    return !hasOnlyAllowedFields(difference, {
      collaboration: {
        allowEventsFromSubtemplateContentSpaces: true,
      },
    });
  }

  async getSubtemplateContentSpaces(
    templateContentSpace: ITemplateContentSpace,
    args?: LimitAndShuffleIdsQueryArgs
  ): Promise<ITemplateContentSpace[]> {
    let templateContentSpaceWithSubtemplateContentSpaces;
    if (args && args.IDs) {
      {
        templateContentSpaceWithSubtemplateContentSpaces =
          await this.getTemplateContentSpaceOrFail(templateContentSpace.id, {
            relations: {
              subtemplateContentSpaces: {
                about: {
                  profile: true,
                },
              },
            },
          });
        templateContentSpaceWithSubtemplateContentSpaces.subtemplateContentSpaces =
          templateContentSpaceWithSubtemplateContentSpaces.subtemplateContentSpaces?.filter(
            c => args.IDs?.includes(c.id)
          );
      }
    } else
      templateContentSpaceWithSubtemplateContentSpaces =
        await this.getTemplateContentSpaceOrFail(templateContentSpace.id, {
          relations: {
            subtemplateContentSpaces: {
              about: {
                profile: true,
              },
            },
          },
        });

    const subtemplateContentSpaces =
      templateContentSpaceWithSubtemplateContentSpaces.subtemplateContentSpaces;
    if (!subtemplateContentSpaces) {
      throw new RelationshipNotFoundException(
        `Unable to load subtemplateContentSpaces for TemplateContentSpace ${templateContentSpace.id} `,
        LogContext.SPACES
      );
    }

    const limitAndShuffled = limitAndShuffle(
      subtemplateContentSpaces,
      args?.limit,
      args?.shuffle
    );

    // Sort the subtemplateContentSpaces base on their display name
    const sortedSubtemplateContentSpaces = limitAndShuffled.sort((a, b) =>
      a.about.profile.displayName.toLowerCase() >
      b.about.profile.displayName.toLowerCase()
        ? 1
        : -1
    );
    return sortedSubtemplateContentSpaces;
  }

  async getSubscriptions(
    templateContentSpaceInput: ITemplateContentSpace
  ): Promise<ITemplateContentSpaceSubscription[]> {
    const templateContentSpace = await this.getTemplateContentSpaceOrFail(
      templateContentSpaceInput.id,
      {
        relations: {
          agent: {
            credentials: true,
          },
        },
      }
    );
    if (
      !templateContentSpace.agent ||
      !templateContentSpace.agent.credentials
    ) {
      throw new EntityNotFoundException(
        `Unable to find agent with credentials for templateContentSpace: ${templateContentSpaceInput.id}`,
        LogContext.ACCOUNT
      );
    }
    const subscriptions: ITemplateContentSpaceSubscription[] = [];
    for (const credential of templateContentSpace.agent.credentials) {
      if (
        Object.values(LicensingCredentialBasedCredentialType).includes(
          credential.type as LicensingCredentialBasedCredentialType
        )
      ) {
        subscriptions.push({
          name: credential.type as LicensingCredentialBasedCredentialType,
          expires: credential.expires,
        });
      }
    }
    return subscriptions;
  }

  async createSubtemplateContentSpace(
    subtemplateContentSpaceData: CreateSubtemplateContentSpaceInput,
    agentInfo?: AgentInfo
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace = await this.getTemplateContentSpaceOrFail(
      subtemplateContentSpaceData.templateContentSpaceID,
      {
        relations: {
          storageAggregator: true,
          templatesManager: true,
          community: {
            roleSet: true,
          },
        },
      }
    );

    if (
      !templateContentSpace.storageAggregator ||
      !templateContentSpace.community
    ) {
      throw new EntityNotFoundException(
        `Unable to retrieve entities on templateContentSpace for creating subtemplateContentSpace: ${templateContentSpace.id}`,
        LogContext.SPACES
      );
    }
    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInLevelZeroTemplateContentSpace(
        templateContentSpace.levelZeroTemplateContentSpaceID
      );
    if (!subtemplateContentSpaceData.nameID) {
      subtemplateContentSpaceData.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          subtemplateContentSpaceData.about.profileData.displayName,
          reservedNameIDs
        );
    } else {
      if (reservedNameIDs.includes(subtemplateContentSpaceData.nameID)) {
        throw new ValidationException(
          `Unable to create entity: the provided nameID is already taken: ${subtemplateContentSpaceData.nameID}`,
          LogContext.SPACES
        );
      }
    }

    // Update the subtemplateContentSpace data being passed in to set the storage aggregator to use
    subtemplateContentSpaceData.storageAggregatorParent =
      templateContentSpace.storageAggregator;
    subtemplateContentSpaceData.templatesManagerParent =
      templateContentSpace.templatesManager;
    subtemplateContentSpaceData.level = templateContentSpace.level + 1;
    let subtemplateContentSpace = await this.createTemplateContentSpace(
      subtemplateContentSpaceData,
      agentInfo
    );

    subtemplateContentSpace =
      await this.addSubtemplateContentSpaceToTemplateContentSpace(
        templateContentSpace,
        subtemplateContentSpace
      );
    subtemplateContentSpace = await this.save(subtemplateContentSpace);

    subtemplateContentSpace = await this.getTemplateContentSpaceOrFail(
      subtemplateContentSpace.id,
      {
        relations: {
          about: {
            profile: true,
          },
          community: {
            roleSet: true,
          },
        },
      }
    );

    // Before assigning roles in the subtemplateContentSpace check that the user is a member
    if (agentInfo) {
      if (
        !subtemplateContentSpace.community ||
        !subtemplateContentSpace.community.roleSet
      ) {
        throw new EntityNotInitializedException(
          `unable to load community with role set: ${subtemplateContentSpace.id}`,
          LogContext.SPACES
        );
      }
      const roleSet = subtemplateContentSpace.community.roleSet;
      const parentRoleSet = templateContentSpace.community.roleSet;
      const agent = await this.agentService.getAgentOrFail(agentInfo?.agentID);
      const isMember = await this.roleSetService.isMember(agent, parentRoleSet);
      if (isMember) {
        await this.assignUserToRoles(roleSet, agentInfo);
      }
    }

    return subtemplateContentSpace;
  }

  public async addSubtemplateContentSpaceToTemplateContentSpace(
    templateContentSpace: ITemplateContentSpace,
    subtemplateContentSpace: ITemplateContentSpace
  ): Promise<ITemplateContentSpace> {
    if (
      !templateContentSpace.community ||
      !subtemplateContentSpace.community ||
      !templateContentSpace.community.roleSet ||
      !subtemplateContentSpace.community.roleSet
    ) {
      throw new ValidationException(
        `Unable to add SubtemplateContentSpace to templateContentSpace, missing community or roleset relations: ${templateContentSpace.id}`,
        LogContext.SPACES
      );
    }

    // Set the parent templateContentSpace directly, avoiding saving the whole parent
    subtemplateContentSpace.parentTemplateContentSpace = templateContentSpace;
    subtemplateContentSpace.levelZeroTemplateContentSpaceID =
      templateContentSpace.levelZeroTemplateContentSpaceID;

    // Finally set the community relationship
    subtemplateContentSpace.community =
      await this.setRoleSetHierarchyForSubtemplateContentSpace(
        templateContentSpace.community,
        subtemplateContentSpace.community
      );

    return subtemplateContentSpace;
  }

  async getSubtemplateContentSpace(
    subtemplateContentSpaceID: string,
    templateContentSpace: ITemplateContentSpace
  ): Promise<ITemplateContentSpace> {
    return await this.getSubtemplateContentSpaceInLevelZeroScopeOrFail(
      subtemplateContentSpaceID,
      templateContentSpace.levelZeroTemplateContentSpaceID
    );
  }

  public async assignUserToRoles(roleSet: IRoleSet, agentInfo: AgentInfo) {
    await this.roleSetService.assignUserToRole(
      roleSet,
      RoleName.MEMBER,
      agentInfo.userID,
      agentInfo
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      RoleName.LEAD,
      agentInfo.userID,
      agentInfo
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      RoleName.ADMIN,
      agentInfo.userID,
      agentInfo
    );
  }

  public async assignOrganizationToMemberLeadRoles(
    roleSet: IRoleSet,
    organizationID: string
  ) {
    await this.roleSetService.assignOrganizationToRole(
      roleSet,
      RoleName.MEMBER,
      organizationID
    );

    await this.roleSetService.assignOrganizationToRole(
      roleSet,
      RoleName.LEAD,
      organizationID
    );
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
        `SubtemplateContentSpace not initialised: ${templateContentSpaceData.ID}`,
        LogContext.SPACES
      );
    }

    if (templateContentSpaceData.about) {
      templateContentSpace.about =
        await this.templateContentSpaceAboutService.updateTemplateContentSpaceAbout(
          templateContentSpace.about,
          templateContentSpaceData.about
        );
    }

    return await this.save(templateContentSpace);
  }

  async getSubtemplateContentSpaceByNameIdInLevelZeroTemplateContentSpace(
    subtemplateContentSpaceNameID: string,
    levelZeroTemplateContentSpaceID: string,
    options?: FindOneOptions<TemplateContentSpace>
  ): Promise<ITemplateContentSpace | null> {
    const subtemplateContentSpace =
      await this.templateContentSpaceRepository.findOne({
        where: {
          nameID: subtemplateContentSpaceNameID,
          levelZeroTemplateContentSpaceID: levelZeroTemplateContentSpaceID,
        },
        ...options,
      });

    return subtemplateContentSpace;
  }

  async getSubtemplateContentSpaceInLevelZeroScopeOrFail(
    subtemplateContentSpaceID: string,
    levelZeroTemplateContentSpaceID: string,
    options?: FindOneOptions<TemplateContentSpace>
  ): Promise<ITemplateContentSpace> {
    const subtemplateContentSpace =
      await this.getSubtemplateContentSpaceByNameIdInLevelZeroTemplateContentSpace(
        subtemplateContentSpaceID,
        levelZeroTemplateContentSpaceID,
        options
      );

    if (!subtemplateContentSpace) {
      throw new EntityNotFoundException(
        `Unable to find TemplateContentSpace with ID: ${subtemplateContentSpaceID}`,
        LogContext.SPACES
      );
    }

    return subtemplateContentSpace;
  }

  private async setRoleSetHierarchyForSubtemplateContentSpace(
    parentCommunity: ICommunity,
    childCommunity: ICommunity | undefined
  ): Promise<ICommunity> {
    if (
      !childCommunity ||
      !childCommunity.roleSet ||
      !parentCommunity ||
      !parentCommunity.roleSet
    ) {
      throw new EntityNotInitializedException(
        `Unable to set the parent relationship for rolesets: ${childCommunity?.id} and ${parentCommunity?.id}`,
        LogContext.COMMUNITY
      );
    }

    childCommunity.roleSet =
      await this.roleSetService.setParentRoleSetAndCredentials(
        childCommunity.roleSet,
        parentCommunity.roleSet
      );
    return childCommunity;
  }

  public async updateSettings(
    templateContentSpace: ITemplateContentSpace,
    settingsData: UpdateTemplateContentSpaceSettingsEntityInput
  ): Promise<ITemplateContentSpace> {
    const settings = templateContentSpace.settings;
    const updatedSettings =
      this.templateContentSpaceSettingsService.updateSettings(
        settings,
        settingsData
      );
    templateContentSpace.settings = updatedSettings;
    return await this.save(templateContentSpace);
  }

  public async getAccountForLevelZeroTemplateContentSpaceOrFail(
    templateContentSpace: ITemplateContentSpace
  ): Promise<IAccount> {
    const templateContentSpaceWithAccount =
      await this.templateContentSpaceRepository.findOne({
        where: { id: templateContentSpace.levelZeroTemplateContentSpaceID },
        relations: {
          account: true,
        },
      });

    if (
      !templateContentSpaceWithAccount ||
      !templateContentSpaceWithAccount.account
    ) {
      throw new EntityNotFoundException(
        `Unable to find account for templateContentSpace with ID: ${templateContentSpace.id} + level zero templateContentSpace ID: ${templateContentSpace.levelZeroTemplateContentSpaceID}`,
        LogContext.SPACES
      );
    }

    return templateContentSpaceWithAccount.account;
  }

  public async getCommunity(
    templateContentSpaceId: string
  ): Promise<ICommunity> {
    const subtemplateContentSpaceWithCommunity =
      await this.getTemplateContentSpaceOrFail(templateContentSpaceId, {
        relations: { community: true },
      });
    const community = subtemplateContentSpaceWithCommunity.community;
    if (!community)
      throw new RelationshipNotFoundException(
        `Unable to load community for subtemplateContentSpace ${templateContentSpaceId} `,
        LogContext.COMMUNITY
      );
    return community;
  }

  async getTemplatesManagerOrFail(
    rootTemplateContentSpaceID: string
  ): Promise<ITemplatesManager> {
    const levelZeroTemplateContentSpace =
      await this.getTemplateContentSpaceOrFail(rootTemplateContentSpaceID, {
        relations: {
          templatesManager: true,
        },
      });

    if (!levelZeroTemplateContentSpace?.templatesManager) {
      throw new EntityNotFoundException(
        `Unable to find templatesManager for level zero templateContentSpace with id: ${rootTemplateContentSpaceID}`,
        LogContext.SPACES
      );
    }

    return levelZeroTemplateContentSpace.templatesManager;
  }

  public async activeSubscription(
    templateContentSpace: ITemplateContentSpace
  ): Promise<ITemplateContentSpaceSubscription | undefined> {
    const today = new Date();
    let plans: ILicensePlan[] = [];

    try {
      const licensingFramework =
        await this.licensingFrameworkService.getDefaultLicensingOrFail();

      plans = await this.licensingFrameworkService.getLicensePlansOrFail(
        licensingFramework.id
      );
    } catch (error) {
      this.logger.error(
        'Failed to retrieve licensing framework',
        error,
        LogContext.LICENSE
      );
      return undefined;
    }

    return (await this.getSubscriptions(templateContentSpace))
      .filter(
        subscription => !subscription.expires || subscription.expires > today
      )
      .map(subscription => {
        return {
          subscription,
          plan: plans.find(
            plan => plan.licenseCredential === subscription.name
          ),
        };
      })
      .filter(
        item => item.plan?.type === LicensingCredentialBasedPlanType.SPACE_PLAN
      )
      .sort((a, b) => b.plan!.sortOrder - a.plan!.sortOrder)?.[0]?.subscription;
  }

  public async getStorageAggregatorOrFail(
    templateContentSpaceID: string
  ): Promise<IStorageAggregator> {
    const templateContentSpace = await this.getTemplateContentSpaceOrFail(
      templateContentSpaceID,
      {
        relations: {
          storageAggregator: true,
        },
      }
    );
    const storageAggregator = templateContentSpace.storageAggregator;
    if (!storageAggregator)
      throw new RelationshipNotFoundException(
        `Unable to load storage aggregator for templateContentSpace ${templateContentSpaceID} `,
        LogContext.SPACES
      );
    return storageAggregator;
  }

  public async getTemplateContentSpaceAbout(
    templateContentSpaceID: string
  ): Promise<ITemplateContentSpaceAbout> {
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
        LogContext.SPACES
      );
    return about;
  }

  /**
   * Retrieves a callouts set for a given templateContentSpace ID or throws if not found.
   * @throws {RelationshipNotFoundException} if callouts set or collaboration is not found.
   * @throws {EntityNotFoundException} if templateContentSpace is not found.
   */
  public async getCalloutsSetOrFail(
    templateContentSpaceId: string
  ): Promise<ICalloutsSet> {
    const subtemplateContentSpaceWithCollaboration =
      await this.getTemplateContentSpaceOrFail(templateContentSpaceId, {
        relations: {
          collaboration: {
            calloutsSet: true,
          },
        },
      });
    const calloutsSet =
      subtemplateContentSpaceWithCollaboration.collaboration?.calloutsSet;
    if (!calloutsSet)
      throw new RelationshipNotFoundException(
        `Unable to load calloutsSet for stemplateContentSpace ${templateContentSpaceId} `,
        LogContext.COLLABORATION
      );
    return calloutsSet;
  }

  public async getAgent(subtemplateContentSpaceId: string): Promise<IAgent> {
    const subtemplateContentSpaceWithContext =
      await this.getTemplateContentSpaceOrFail(subtemplateContentSpaceId, {
        relations: { agent: true },
      });
    const agent = subtemplateContentSpaceWithContext.agent;
    if (!agent)
      throw new RelationshipNotFoundException(
        `Unable to load Agent for subtemplateContentSpace ${subtemplateContentSpaceId}`,
        LogContext.AGENT
      );
    return agent;
  }
}
