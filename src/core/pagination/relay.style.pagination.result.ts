import { Field, ObjectType } from '@nestjs/graphql';
import { Type } from '@nestjs/common';

interface IRelayStyleEdge<T> {
  cursor: string;
  node: T;
}

interface IRelayStylePageInfo {
  endCursor: string;
  hasNextPage: boolean;
}

export interface IRelayStylePaginatedType<T> {
  edges: IRelayStyleEdge<T>[];
  pageInfo: IRelayStylePageInfo;
}

export function RelayStylePaginate<T>(
  classRef: Type<T>
): Type<IRelayStylePaginatedType<T>> {
  @ObjectType(`${classRef.name}Edge`)
  abstract class RelayStyleEdge {
    @Field(() => String)
    cursor!: string;

    @Field(() => classRef)
    node!: T;
  }

  @ObjectType(`${classRef.name}PageInfo`)
  abstract class RelayStylePageInfo {
    @Field(() => String)
    endCursor!: string;

    @Field(() => Boolean)
    hasNextPage!: boolean;
  }

  @ObjectType({ isAbstract: true })
  abstract class RelayStylePaginatedType
    implements IRelayStylePaginatedType<T>
  {
    @Field(() => [RelayStyleEdge], { nullable: true })
    edges!: RelayStyleEdge[];

    @Field(() => RelayStylePageInfo, { nullable: true })
    pageInfo!: RelayStylePageInfo;
  }
  return RelayStylePaginatedType as Type<IRelayStylePaginatedType<T>>;
}
