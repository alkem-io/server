import { ObjectType } from '@nestjs/graphql';
import { Paginate } from './paginated.type';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';

@ObjectType()
export class PaginatedVirtualContributor extends Paginate(
  IVirtualContributor,
  'virtualContributors'
) {}
