import { ObjectType } from '@nestjs/graphql';
import { IUser } from '@src/domain/community/user';
import { RelayStylePaginate } from './relay.style.paginated.type';
import { Paginate } from './paginated.type';

@ObjectType()
class RelayPaginatedUser extends IUser {}

@ObjectType()
export class RelayStylePaginatedUser extends RelayStylePaginate(
  RelayPaginatedUser
) {}

@ObjectType()
export class PaginatedUsers extends Paginate(IUser, 'users') {}
