import {
  ApolloServerPlugin,
  GraphQLFieldResolverParams,
  GraphQLRequestContextDidResolveOperation,
  GraphQLRequestListener,
} from '@apollo/server';
import { GraphQLRequestListenerDidResolveField } from '@apollo/server/src/externalTypes/plugins';
import { GraphQLObjectType } from 'graphql/type';
import { IncomingMessage } from 'http';
import { apmAgent } from '../apm';

const ENABLE_GLOBAL_INSTRUMENTATION = false;

type PlainContext = { req: IncomingMessage };
export const ApmApolloPlugin: ApolloServerPlugin<any> = {
  /**
   * The requestDidStart event fires whenever Apollo Server begins fulfilling a GraphQL request.
   * This function can optionally return an object that includes functions for responding to request lifecycle events that might follow requestDidStart.
   */
  async requestDidStart(): Promise<GraphQLRequestListener<PlainContext> | void> {
    return {
      /**
       * The didResolveOperation event fires after the graphql library successfully determines the operation to execute from a request's document AST. At this stage, both the operationName string and operation AST are available.
       * This event is not associated with your GraphQL server's resolvers. When this event fires, your resolvers have not yet executed (they execute after executionDidStart)
       * If the operation is anonymous (i.e., the operation is query { ... } instead of query NamedQuery { ... }), then operationName is null.
       * If a didResolveOperation hook throws a GraphQLError, that error is serialized and returned to the client with an HTTP status code of 500 unless it specifies a different status code.
       * The didResolveOperation hook is a great spot to perform extra validation because it has access to the parsed
       * and validated operation and the request-specific context (i.e., contextValue).
       * Multiple plugins can run the didResolveOperation in parallel, but if more than one plugin throws, the client only receives a single error.
       *
       * ```TypeScript
       * didResolveOperation?(
       *   requestContext: WithRequired<
       *     GraphQLRequestContext<TContext>,
       *     'source' | 'queryHash' | 'document' | 'operationName'
       *   >,
       * ): Promise<void>;
       * ```
       */
      async didResolveOperation(
        requestContext: GraphQLRequestContextDidResolveOperation<PlainContext>
      ) {
        if (!apmAgent?.currentTransaction) {
          // no active transaction
          return;
        }

        const operationName = assignOperationName(requestContext);
        const operationType =
          requestContext.operation?.operation ?? 'unknown type';

        apmAgent.currentTransaction.setType(operationType);
        apmAgent.currentTransaction.name = `[${operationType}] ${operationName}`;
      },
      async executionDidStart() {
        if (!ENABLE_GLOBAL_INSTRUMENTATION) {
          return;
        }
        return {
          /**
           * The willResolveField event fires whenever Apollo Server is about to resolve a single field during the execution of an operation. The handler is passed an object with four fields (source, args, contextValue, and info) that correspond to the four positional arguments passed to resolvers.
           * Note that source corresponds to the argument often called parent in our docs.
           * You provide your willResolveField handler in the object returned by your executionDidStart handler.
           * Your willResolveField handler can optionally return an "end hook" function that's invoked with the resolver's result (or the error that it throws).
           * The end hook is called when your resolver has fully resolved (e.g., if the resolver returns a Promise, the hook is called with the Promise's eventual resolved result).
           * willResolveField and its end hook are synchronous plugin APIs (i.e., they do not return Promises).
           * willResolveField only fires when a field is resolved inside the Apollo Server itself; it does not fire at all if the server is a Gateway.
           */
          willResolveField({
            args,
            info,
          }: GraphQLFieldResolverParams<
            any,
            PlainContext | IGraphQLContext
          >): GraphQLRequestListenerDidResolveField | void {
            if (!apmAgent?.currentTransaction) {
              // no active transaction
              return;
            }
            const { fieldName, parentType } = info;
            // start span
            const span = apmAgent.currentTransaction.startSpan(
              fieldName,
              'graphql'
            );

            if (!span) {
              // span could not be started
              // judging by the source code that could happen if there was no current transaction started
              // in our case that should not be possible
              return;
            }
            span.subtype = assignOperationType(parentType);

            if (Object.keys(args).length > 0) {
              span.setLabel('args', JSON.stringify(args), false);
            }
            return error => {
              // measure
              span.setOutcome(error ? 'failure' : 'success');
              span.end();
            };
          },
        };
      },
    };
  },
};

const assignOperationName = (
  requestContext: GraphQLRequestContextDidResolveOperation<any>
) => {
  return requestContext.operationName ?? requestContext.queryHash;
};

const assignOperationType = (parentType: GraphQLObjectType) => {
  const { name } = parentType;

  if (name === 'Query') {
    return 'query-resolver';
  } else if (name === 'Mutation') {
    return 'mutation-resolver';
  } else if (name === 'Subscription') {
    return 'subscription-resolver';
  } else {
    return 'field-resolver';
  }
};
