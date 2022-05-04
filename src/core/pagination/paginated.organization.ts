import { ObjectType } from '@nestjs/graphql';
import { Paginate } from '@core/pagination/paginated.type';
import { IOrganization } from '@src/domain';

@ObjectType()
export class PaginatedOrganization extends Paginate(
  IOrganization,
  'organization'
) {}
