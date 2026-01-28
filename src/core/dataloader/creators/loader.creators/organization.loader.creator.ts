import { Organization } from '@domain/community/organization/organization.entity';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedSimpleDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
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
