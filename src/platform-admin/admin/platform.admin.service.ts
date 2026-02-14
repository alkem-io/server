import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { SpaceLevel } from '@common/enums/space.level';
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
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type DrizzleDb } from '@config/drizzle/drizzle.constants';
import { inArray, eq } from 'drizzle-orm';
import { innovationHubs } from '@domain/innovation-hub/innovation.hub.schema';
import { innovationPacks } from '@library/innovation-pack/innovation.pack.schema';
import { spaces } from '@domain/space/space/space.schema';

@Injectable()
export class PlatformAdminService {
  constructor(
    private spaceService: SpaceService,
    private organizationService: OrganizationService,
    private userService: UserService,
    private virtualContributorService: VirtualContributorService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    private libraryService: LibraryService
  ) {}

  public async getAllInnovationHubs(): Promise<IInnovationHub[]> {
    const results = await this.db.query.innovationHubs.findMany();
    return results as unknown as IInnovationHub[];
  }

  public async getAllSpaces(
    args: SpacesQueryArgs,
    sort: 'ASC' | 'DESC' = 'DESC'
  ): Promise<ISpace[]> {
    const visibilities = args?.filter?.visibilities;
    const IDs = args?.IDs;

    const conditions = [];
    if (visibilities?.length) {
      conditions.push(inArray(spaces.visibility, visibilities));
    }
    if (IDs?.length) {
      conditions.push(inArray(spaces.id, IDs));
    }
    conditions.push(eq(spaces.level, SpaceLevel.L0));

    return this.spaceService.getAllSpaces({
      where: conditions.length > 0 ? conditions : undefined,
    });
  }

  public async getAllInnovationPacks(
    args?: InnovationPacksInput
  ): Promise<IInnovationPack[]> {
    const packResults = await this.db.query.innovationPacks.findMany({
      with: {
        templatesSet: true,
      },
    });

    const innovationPacksTyped = packResults as unknown as InnovationPack[];

    return await this.libraryService.sortAndFilterInnovationPacks(
      innovationPacksTyped,
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
