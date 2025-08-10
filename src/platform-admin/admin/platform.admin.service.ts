import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { OrganizationFilterInput } from '@core/filtering/input-types/organization.filter.input';
import { UserFilterInput } from '@core/filtering/input-types/user.filter.input';
import { PaginatedOrganization } from '@core/pagination/paginated.organization';
import { PaginatedUsers } from '@core/pagination/paginated.user';
import { PaginationArgs } from '@core/pagination/pagination.args';
import { ContributorQueryArgs } from '@domain/community/contributor/dto/contributor.query.args';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { SpacesQueryArgs } from '@domain/space/space/dto/space.args.query.spaces';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceService } from '@domain/space/space/space.service';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPacksInput } from '@library/library/dto/library.dto.innovationPacks.input';
import { LibraryService } from '@library/library/library.service';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class PlatformAdminService {
  constructor(
    private spaceService: SpaceService,
    private organizationService: OrganizationService,
    private userService: UserService,
    private virtualContributorService: VirtualContributorService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private libraryService: LibraryService
  ) {}

  public async getAllInnovationHubs(): Promise<IInnovationHub[]> {
    const innovationHubs = await this.entityManager.find(InnovationHub, {});
    return innovationHubs;
  }

  public async getAllSpaces(args: SpacesQueryArgs): Promise<ISpace[]> {
    return this.spaceService.getSpacesSorted(args);
  }

  public async getAllInnovationPacks(
    args?: InnovationPacksInput
  ): Promise<IInnovationPack[]> {
    const innovationPacks = await this.entityManager.find(InnovationPack, {
      relations: {
        templatesSet: true,
      },
    });

    return await this.libraryService.sortAndFilterInnovationPacks(
      innovationPacks,
      args?.limit,
      args?.orderBy
    );
  }

  public async getAllUsers(
    paginationArgs?: PaginationArgs,
    withTags?: boolean,
    filter?: UserFilterInput
  ): Promise<PaginatedUsers> {
    const query = paginationArgs ?? new PaginationArgs();
    return this.userService.getPaginatedUsers(query, withTags, filter);
  }

  public async getAllOrganizations(
    paginationArgs?: PaginationArgs,
    filter?: OrganizationFilterInput,
    status?: OrganizationVerificationEnum
  ): Promise<PaginatedOrganization> {
    const query = paginationArgs ?? new PaginationArgs();
    return await this.organizationService.getPaginatedOrganizations(
      query,
      filter,
      status
    );
  }

  public async getAllVirtualContributors(
    args?: ContributorQueryArgs
  ): Promise<IVirtualContributor[]> {
    const query = args ?? new ContributorQueryArgs();
    return await this.virtualContributorService.getVirtualContributors(query);
  }
}
