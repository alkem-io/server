import { ObjectType } from '@nestjs/graphql';
import { IUser } from '@src/domain';
import { RelayStylePaginate } from './relay.style.paginated.type';
import { Paginate } from './paginated.type';

@ObjectType()
class RelayPaginatedUser extends IUser {}

@ObjectType()
export class RelayStylePaginatedUser extends RelayStylePaginate(
  RelayPaginatedUser
) {}

@ObjectType('User1')
class User extends IUser {}

@ObjectType()
export class PaginatedUsers extends Paginate(User, 'users') {}
