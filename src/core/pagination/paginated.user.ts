import { ObjectType } from '@nestjs/graphql';
import { IUser } from '@src/domain';
import { RelayStylePaginate } from './relay.style.pagination.result';

@ObjectType()
class ConcreteUser extends IUser {}

@ObjectType()
export class RelayStylePaginatedUser extends RelayStylePaginate(ConcreteUser) {}
