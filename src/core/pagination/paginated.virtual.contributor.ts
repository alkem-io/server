import { ObjectType } from '@nestjs/graphql';
import { Paginate } from './paginated.type';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';

@ObjectType()
export class PaginatedVirtualContributor extends Paginate(
  VirtualContributor,
  'virtualContributors'
) {}
