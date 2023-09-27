import { ObjectType } from '@nestjs/graphql';
import { RelayStylePaginate } from './relay.style.paginated.type';
import { Paginate } from './paginated.type';
import { ISpace } from '@domain/challenge/space/space.interface';

@ObjectType()
class RelayPaginatedSpace extends ISpace {}

@ObjectType()
export class RelayStylePaginatedSpace extends RelayStylePaginate(
  RelayPaginatedSpace
) {}

@ObjectType()
export class PaginatedSpaces extends Paginate(ISpace, 'spaces') {}
