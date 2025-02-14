import {
  ApolloServerPlugin,
  GraphQLRequestContextDidResolveOperation,
} from '@apollo/server';
import { apmAgent } from '../apm';

export const ApmApolloPlugin: ApolloServerPlugin<any> = {
  async requestDidStart() {
    return {
      async didResolveOperation(
        requestContext: GraphQLRequestContextDidResolveOperation<any>
      ) {
        if (!apmAgent.currentTransaction) {
          // no active transaction
          return;
        }

        apmAgent.currentTransaction.name =
          requestContext.operationName ?? 'Unnamed';
        apmAgent.currentTransaction.type =
          requestContext.operation?.operation ?? 'unknown type';
      },
    };
  },
};
