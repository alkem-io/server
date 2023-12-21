import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  GraphQLRequestContextWillSendResponse,
  GraphQLRequestContextExecutionDidStart,
  GraphQLRequestExecutionListener,
  GraphQLFieldResolverParams,
} from 'apollo-server-plugin-base';
import { ApolloAuditTrailPluginOptions } from './options';
import { GraphQLRequestListenerDidResolveField } from "apollo-server-plugin-base/src";

export const ApolloAuditTrailPlugin = (
  options?: ApolloAuditTrailPluginOptions
): ApolloServerPlugin<IGraphQLContext> => {
  return {
    // Called once per request, before parsing or validation of the request has
    // occurred. This hook can return an object of more fine-grained hooks (see
    // `GraphQLRequestListener`) which pertain to the lifecycle of the request.
    async requestDidStart(): Promise<GraphQLRequestListener<IGraphQLContext>> {
      return {
        async willSendResponse(
          willSendResponseContext: GraphQLRequestContextWillSendResponse<IGraphQLContext>
        ): Promise<void> {
          // console.log('willSendResponse', willSendResponseContext);
        },
        async executionDidStart(
          requestContext: GraphQLRequestContextExecutionDidStart<IGraphQLContext>,
        ): Promise<GraphQLRequestExecutionListener | void> {
          return {
            willResolveField(
              fieldResolverParams: GraphQLFieldResolverParams<any, IGraphQLContext>,
            ): GraphQLRequestListenerDidResolveField | void {
              console.log('willResolveField', fieldResolverParams);
            },
          };
        },
      };
    },
  };
};
