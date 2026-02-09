import { ISpace } from '@domain/space/space/space.interface';
import { ObjectType } from '@nestjs/graphql';
import { Paginate } from './paginated.type';
import { RelayStylePaginate } from './relay.style.paginated.type';

@ObjectType()
class RelayPaginatedSpace extends ISpace {}

@ObjectType()
export class RelayStylePaginatedSpace extends RelayStylePaginate(
  RelayPaginatedSpace
) {}

@ObjectType()
export class PaginatedSpaces extends Paginate(ISpace, 'spaces') {}
