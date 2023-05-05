import { ObjectType } from '@nestjs/graphql';
import { Paginate } from '@core/pagination/paginated.type';
import { IOrganization } from '@src/domain/community/organization';

@ObjectType()
export class PaginatedOrganization extends Paginate(
  IOrganization,
  'organization'
) {}
