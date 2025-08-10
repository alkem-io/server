import { IOrganization } from '@domain/community/organization/organization.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlatformAdminService {
  constructor() {}

  public async getAllInnovationHubs(): Promise<IInnovationHub[]> {
    return [];
  }

  public async getAllSpaces(): Promise<ISpace[]> {
    return [];
  }

  public async getAllInnovationPacks(): Promise<IInnovationPack[]> {
    return [];
  }

  public async getAllUsers(): Promise<IUser[]> {
    return [];
  }

  public async getAllOrganizations(): Promise<IOrganization[]> {
    return [];
  }

  public async getAllVirtualContributors(): Promise<IVirtualContributor[]> {
    return [];
  }
}
