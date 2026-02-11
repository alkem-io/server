import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { ObjectType } from '@nestjs/graphql';
import { Paginate } from './paginated.type';

@ObjectType()
export class PaginatedVirtualContributor extends Paginate(
  IVirtualContributor,
  'virtualContributors'
) {}
