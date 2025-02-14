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

        const operationName = assignOperationName(requestContext);
        const operationType =
          requestContext.operation?.operation ?? 'unknown type';

        apmAgent.currentTransaction.type = operationType;
        apmAgent.currentTransaction.name = `[${operationType}] ${operationName}`;
      },
    };
  },
};

const assignOperationName = (
  requestContext: GraphQLRequestContextDidResolveOperation<any>
) => {
  return requestContext.operationName ?? requestContext.queryHash;
};
