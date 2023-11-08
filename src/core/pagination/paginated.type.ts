import { IRelayStylePageInfo } from './relay.style.paginated.type';
import { Type } from '@nestjs/common';
import { Field, ObjectType } from '@nestjs/graphql';

export interface IPaginatedType<T> {
  total: number;
  items: T[];
  pageInfo: IRelayStylePageInfo;
}

@ObjectType()
class PageInfo {
  @Field(() => String, {
    description: 'The first cursor of the page result',
    nullable: true,
  })
  startCursor!: string;

  @Field(() => String, {
    description: 'The last cursor of the page result',
    nullable: true,
  })
  endCursor!: string;

  @Field(() => Boolean, {
    description: 'Indicate whether more items exist after the returned ones',
    nullable: false,
  })
  hasNextPage!: boolean;

  @Field(() => Boolean, {
    description: 'Indicate whether more items exist before the returned ones',
    nullable: false,
  })
  hasPreviousPage!: boolean;
}

/**
 * Generic function which takes a concrete class and returns a relay style typed pagination class
 * @param classRef the concrete class
 * @param fieldName the name of the field which is holding the paginated items; defaults to classRef.name
 */
export function Paginate<T>(classRef: Type<T>, fieldName = classRef.name) {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType implements IPaginatedType<T> {
    @Field(() => Number)
    total!: number;

    @Field(() => [classRef], { name: fieldName })
    items!: T[];

    @Field(() => PageInfo)
    pageInfo!: IRelayStylePageInfo;
  }
  return PaginatedType;
}
