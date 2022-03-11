import { ObjectType } from '@nestjs/graphql';
import { IUser } from '@src/domain';
import { RelayStylePaginate } from './relay.style.paginated.type';

@ObjectType()
class PaginatedUser extends IUser {}

@ObjectType()
export class RelayStylePaginatedUser extends RelayStylePaginate(
  PaginatedUser
) {}
