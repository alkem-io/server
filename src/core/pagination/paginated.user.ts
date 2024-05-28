import { ObjectType } from '@nestjs/graphql';
import { IUser } from '@src/domain/community/user';
import { Paginate } from './paginated.type';

@ObjectType()
export class PaginatedUsers extends Paginate(IUser, 'users') {}
