import { EntityManager } from 'typeorm';
import { Injectable, Scope } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { createTypedSimpleDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { Organization } from '@domain/community/organization/organization.entity';

@Injectable({ scope: Scope.REQUEST })
export class OrganizationLoaderCreator
  implements DataLoaderCreator<IOrganization>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<IOrganization>) {
    return createTypedSimpleDataLoader(
      this.manager,
      Organization,
      this.constructor.name,
      options
    );
  }
}
