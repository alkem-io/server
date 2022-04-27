import { Field, ObjectType } from '@nestjs/graphql';
import { Type } from '@nestjs/common';

/***
 * @see https://relay.dev/graphql/connections.htm#sec-Edge-Types
 * A generic interface for an edge of the page.
 * Bear in mind that the specification is requiring a cursor to be present in each edge
 * which is defined in Relay Legacy specification.
 * Here we are relying on the more modern approach of Relay Modern
 * where *startCursor* and *endCursor* are defined in the {@link IRelayStylePageInfo}
 * in order to save bandwidth, since it doesnt use any cursors in between
 *
 * This can be further simplified to not include edges at all but a node instead
 *
 * @typedef IRelayStyleEdge
 * @prop {T} node A generic node, containing the queried object
 */
export interface IRelayStyleEdge<T> {
  node: T;
}

/**
 * @see https://relay.dev/graphql/connections.htm#sec-undefined.PageInfo
 * Interface for the metadata of the page.
 *
 * @typedef IRelayStylePageInfo
 * @prop {string} startCursor The cursor of the first object in the page
 * @prop {string} endCursor The cursor of the last object in the page
 * @prop {boolean} hasNextPage If there are additional pages after this one
 */
export interface IRelayStylePageInfo {
  startCursor?: string;
  endCursor?: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * @see https://relay.dev/graphql/connections.htm#sec-Connection-Types
 * Generic interface for the paginated results
 *
 * @typedef IRelayStylePaginatedType
 * @prop {IRelayStyleEdge[]} edges The edges of the page, representing each result in the page
 * @prop {IRelayStylePageInfo} pageInfo The page info: metadata about the page
 */
export interface IRelayStylePaginatedType<T> {
  edges: IRelayStyleEdge<T>[];
  pageInfo: IRelayStylePageInfo;
}

/**
 * Generic function which takes a concrete class and returns a relay style typed pagination class
 * @param classRef the concrete class
 */
export function RelayStylePaginate<T>(
  classRef: Type<T>
): Type<IRelayStylePaginatedType<T>> {
  @ObjectType(`${classRef.name}Edge`)
  abstract class RelayStyleEdge {
    @Field(() => classRef)
    node!: T;
  }

  @ObjectType(`${classRef.name}PageInfo`)
  abstract class RelayStylePageInfo {
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
      description: 'Indicate whether more items exist after the returned once',
      nullable: false,
    })
    hasNextPage!: boolean;

    @Field(() => Boolean, {
      description: 'Indicate whether more items exist before the returned once',
      nullable: false,
    })
    hasPreviousPage!: boolean;
  }

  @ObjectType({ isAbstract: true })
  abstract class RelayStylePaginatedType
    implements IRelayStylePaginatedType<T>
  {
    @Field(() => [RelayStyleEdge])
    edges!: RelayStyleEdge[];

    @Field(() => RelayStylePageInfo)
    pageInfo!: RelayStylePageInfo;
  }
  return RelayStylePaginatedType as Type<IRelayStylePaginatedType<T>>;
}
