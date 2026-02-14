import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { SearchVisibility } from '@common/enums/search.visibility';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Inject, Injectable } from '@nestjs/common';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { eq, or } from 'drizzle-orm';
import { CreateInnovationHubInput, UpdateInnovationHubInput } from './dto';
import { IInnovationHub, InnovationHub, InnovationHubType } from './types';
import { innovationHubs } from './innovation.hub.schema';

@Injectable()
export class InnovationHubService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly profileService: ProfileService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly spaceLookupService: SpaceLookupService,
    private namingService: NamingService,
    private accountLookupService: AccountLookupService
  ) {}

  public async createInnovationHub(
    createData: CreateInnovationHubInput,
    account: IAccount
  ): Promise<IInnovationHub | never> {
    try {
      await this.validateCreateInput(createData);
    } catch (e) {
      const err = e as Error;
      throw new ValidationException(
        `Incorrect input provided: ${err.message}`,
        LogContext.INNOVATION_HUB
      );
    }

    if (!account.storageAggregator) {
      throw new EntityNotFoundException(
        `Unable to load storage aggregator on account for creating innovation Hub: ${account.id}`,
        LogContext.ACCOUNT
      );
    }

    const subdomainAvailable =
      await this.namingService.isInnovationHubSubdomainAvailable(
        createData.subdomain
      );
    if (!subdomainAvailable)
      throw new ValidationException(
        `Unable to create Innovation Hub: the provided subdomain is already taken: ${createData.subdomain}`,
        LogContext.INNOVATION_HUB
      );

    const reservedNameIDs = await this.namingService.getReservedNameIDsInHubs();
    if (createData.nameID && createData.nameID.length > 0) {
      const nameTaken = reservedNameIDs.includes(createData.nameID);
      if (nameTaken)
        throw new ValidationException(
          `Unable to create Innovation Hub: the provided nameID is already taken: ${createData.nameID}`,
          LogContext.INNOVATION_HUB
        );
    } else {
      createData.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          `${createData.profileData.displayName}`,
          reservedNameIDs
        );
    }

    const hub: IInnovationHub = InnovationHub.create(createData);
    hub.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.INNOVATION_HUB
    );
    hub.listedInStore = true;
    hub.searchVisibility = SearchVisibility.ACCOUNT;
    hub.account = account;

    hub.profile = await this.profileService.createProfile(
      createData.profileData,
      ProfileType.INNOVATION_HUB,
      account.storageAggregator
    );

    await this.profileService.addOrUpdateTagsetOnProfile(hub.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    await this.profileService.addVisualsOnProfile(
      hub.profile,
      createData.profileData.visuals,
      [VisualType.BANNER_WIDE]
    );

    return await this.save(hub);
  }

  public async save(hub: IInnovationHub): Promise<IInnovationHub> {
    if (hub.id) {
      const [updated] = await this.db
        .update(innovationHubs)
        .set({
          nameID: hub.nameID,
          subdomain: hub.subdomain,
          type: hub.type,
          spaceVisibilityFilter: hub.spaceVisibilityFilter,
          spaceListFilter: hub.spaceListFilter,
          listedInStore: hub.listedInStore,
          searchVisibility: hub.searchVisibility,
          accountId: hub.account?.id,
          profileId: hub.profile?.id,
          authorizationId: hub.authorization?.id,
        })
        .where(eq(innovationHubs.id, hub.id))
        .returning();
      return updated as unknown as IInnovationHub;
    }
    const [inserted] = await this.db
      .insert(innovationHubs)
      .values({
        nameID: hub.nameID,
        subdomain: hub.subdomain,
        type: hub.type,
        spaceVisibilityFilter: hub.spaceVisibilityFilter,
        spaceListFilter: hub.spaceListFilter,
        listedInStore: hub.listedInStore,
        searchVisibility: hub.searchVisibility,
        accountId: hub.account?.id,
        profileId: hub.profile?.id,
        authorizationId: hub.authorization?.id,
      })
      .returning();
    return inserted as unknown as IInnovationHub;
  }

  public async updateOrFail(
    input: UpdateInnovationHubInput
  ): Promise<IInnovationHub> {
    const innovationHub: IInnovationHub = await this.getInnovationHubOrFail(
      input.ID,
      { with: { profile: true } }
    );

    if (input.nameID) {
      if (input.nameID !== innovationHub.nameID) {
        const reservedNameIDs =
          await this.namingService.getReservedNameIDsInHubs();
        const nameTaken = reservedNameIDs.includes(input.nameID);
        if (nameTaken) {
          throw new ValidationException(
            `Unable to update Innovation Hub nameID: the provided nameID '${input.nameID}' is already taken`,
            LogContext.INNOVATION_HUB
          );
        }
        innovationHub.nameID = input.nameID;
      }
    }
    if (
      innovationHub.type === InnovationHubType.LIST &&
      input.spaceListFilter
    ) {
      if (!input.spaceListFilter.length) {
        throw new Error(
          `At least one Space needs to be provided for Innovation Hub of type '${InnovationHubType.LIST}'`
        );
      }

      // validate spaces
      const trueOrList = await this.spaceLookupService.spacesExist(
        input.spaceListFilter
      );

      if (Array.isArray(trueOrList)) {
        throw new Error(
          `Spaces with the following identifiers not found: '${trueOrList.join(
            ','
          )}'`
        );
      }
      innovationHub.spaceListFilter = input.spaceListFilter;
    }
    if (
      innovationHub.type === InnovationHubType.VISIBILITY &&
      input.spaceVisibilityFilter
    )
      innovationHub.spaceVisibilityFilter = input.spaceVisibilityFilter;
    if (input.profileData) {
      innovationHub.profile = await this.profileService.updateProfile(
        innovationHub.profile,
        input.profileData
      );
    }
    if (typeof input.listedInStore === 'boolean') {
      innovationHub.listedInStore = !!input.listedInStore;
    }

    if (input.searchVisibility) {
      innovationHub.searchVisibility = input.searchVisibility;
    }

    return await this.save(innovationHub);
  }

  public async delete(innovationHubID: string): Promise<IInnovationHub> {
    const hub = await this.getInnovationHubOrFail(innovationHubID, {
      with: { profile: true },
    });

    if (hub.profile) {
      await this.profileService.deleteProfile(hub.profile.id);
    }

    if (hub.authorization)
      await this.authorizationPolicyService.delete(hub.authorization);

    await this.db
      .delete(innovationHubs)
      .where(eq(innovationHubs.id, innovationHubID));
    hub.id = innovationHubID;

    return hub;
  }

  public async getInnovationHubs(): Promise<IInnovationHub[]> {
    const result = await this.db.query.innovationHubs.findMany();
    return result as unknown as IInnovationHub[];
  }

  public async getInnovationHubOrFail(
    innovationHubID: string,
    options?: {
      with?: {
        profile?: boolean;
        authorization?: boolean;
        account?: boolean | {
          with?: {
            authorization?: boolean;
          };
        };
      };
    }
  ): Promise<IInnovationHub> {
    const withClause: Record<string, any> = {};
    if (options?.with?.profile) withClause.profile = true;
    if (options?.with?.authorization) withClause.authorization = true;
    if (options?.with?.account) {
      if (typeof options.with.account === 'object') {
        const nested: any = {};
        if (options.with.account.with?.authorization) nested.authorization = true;
        withClause.account = { with: nested };
      } else {
        withClause.account = true;
      }
    }

    const innovationHub = await this.db.query.innovationHubs.findFirst({
      where: eq(innovationHubs.id, innovationHubID),
      with: Object.keys(withClause).length > 0 ? withClause : undefined,
    });

    if (!innovationHub)
      throw new EntityNotFoundException(
        `Unable to find InnovationHub with ID: ${innovationHubID}`,
        LogContext.SPACES
      );
    return innovationHub as unknown as IInnovationHub;
  }

  public async getInnovationHubByNameIdOrFail(
    innovationHubNameID: string,
    options?: {
      relations?: { profile?: boolean; account?: boolean };
    }
  ): Promise<IInnovationHub> {
    const withClause: Record<string, boolean> = {};
    if (options?.relations?.profile) withClause.profile = true;
    if (options?.relations?.account) withClause.account = true;

    const innovationHub = await this.db.query.innovationHubs.findFirst({
      where: eq(innovationHubs.nameID, innovationHubNameID),
      with: Object.keys(withClause).length > 0 ? withClause : undefined,
    });

    if (!innovationHub)
      throw new EntityNotFoundException(
        `Unable to find InnovationHub with NameID: ${innovationHubNameID}`,
        LogContext.SPACES
      );
    return innovationHub as unknown as IInnovationHub;
  }

  public async getInnovationHubFlexOrFail(
    args: { subdomain?: string; idOrNameId?: string },
    options?: {
      relations?: { profile?: boolean; account?: boolean };
    }
  ): Promise<IInnovationHub | never> {
    if (!Object.keys(args).length) {
      throw new Error('No criteria provided for fetching the Innovation Hub');
    }

    const { idOrNameId, subdomain } = args;

    const conditions = [];
    if (idOrNameId) {
      conditions.push(eq(innovationHubs.id, idOrNameId));
      conditions.push(eq(innovationHubs.nameID, idOrNameId));
    }
    if (subdomain) {
      conditions.push(eq(innovationHubs.subdomain, subdomain));
    }

    const withClause: Record<string, boolean> = {};
    if (options?.relations?.profile) withClause.profile = true;
    if (options?.relations?.account) withClause.account = true;

    const innovationHub = await this.db.query.innovationHubs.findFirst({
      where: or(...conditions),
      with: Object.keys(withClause).length > 0 ? withClause : undefined,
    });

    if (!innovationHub) {
      throw new EntityNotFoundException(
        `Innovation hub '${idOrNameId}' not found`,
        LogContext.INNOVATION_HUB
      );
    }

    return innovationHub as unknown as IInnovationHub;
  }

  public async getSpaceListFilterOrFail(
    hubId: string
  ): Promise<string[] | undefined | never> {
    const hub = await this.db.query.innovationHubs.findFirst({
      where: eq(innovationHubs.id, hubId),
    });

    if (!hub) {
      throw new EntityNotFoundException(
        `Innovation Hub with id: '${hubId}' not found!`,
        LogContext.INNOVATION_HUB
      );
    }

    return hub.spaceListFilter as string[] | undefined;
  }

  private async validateCreateInput({
    type,
    spaceListFilter,
    spaceVisibilityFilter,
  }: CreateInnovationHubInput): Promise<true | never> {
    if (type === InnovationHubType.LIST) {
      if (spaceVisibilityFilter) {
        throw new Error(
          `Visibility filter not applicable for Innovation Hub of type '${InnovationHubType.LIST}'`
        );
      }
      if (spaceListFilter && spaceListFilter.length) {
        // If specified on create, validate spaces
        const trueOrList =
          await this.spaceLookupService.spacesExist(spaceListFilter);

        if (Array.isArray(trueOrList)) {
          throw new Error(
            `Spaces with the following identifiers not found: '${trueOrList.join(
              ','
            )}'`
          );
        }
      }
    }

    if (type === InnovationHubType.VISIBILITY) {
      if (!spaceVisibilityFilter) {
        throw new Error(
          `A visibility needs to be provided for Innovation Hub of type '${InnovationHubType.VISIBILITY}'`
        );
      }

      if (spaceListFilter && spaceListFilter.length) {
        throw new Error(
          `List of Spaces not applicable for Innovation Hub of type '${InnovationHubType.VISIBILITY}'`
        );
      }
    }

    return true;
  }

  public async getProvider(innovationHubID: string): Promise<IContributor> {
    const innovationHub = await this.db.query.innovationHubs.findFirst({
      where: eq(innovationHubs.id, innovationHubID),
      with: {
        account: true,
      },
    });
    if (!innovationHub || !innovationHub.account) {
      throw new RelationshipNotFoundException(
        `Unable to load innovation Hub with account to get Provider ${innovationHubID} `,
        LogContext.LIBRARY
      );
    }
    const provider = await this.accountLookupService.getHost(
      innovationHub.account as any
    );
    if (!provider) {
      throw new RelationshipNotFoundException(
        `Unable to load provider for InnovationHub ${innovationHubID} `,
        LogContext.LIBRARY
      );
    }
    return provider;
  }
}
