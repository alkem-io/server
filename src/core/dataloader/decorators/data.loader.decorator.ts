import { createParamDecorator, ExecutionContext, Type } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { isNonNullType } from 'graphql/type';
import { GraphQLResolveInfo } from 'graphql/type/definition';
import {
  DataLoaderCreator,
  DataLoaderCreatorInitOptions,
} from '../creators/base';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '../data.loader.inject.token';

export function Loader<TParent, TReturn>(
  creatorRef: Type<DataLoaderCreator<TReturn>>,
  options: DataLoaderCreatorInitOptions<TReturn, TParent> = {}
): ParameterDecorator {
  return createParamDecorator(
    (
      innerCreatorRef: Type<DataLoaderCreator<TReturn>>,
      context: ExecutionContext
    ) => {
      const ctx =
        GqlExecutionContext.create(context).getContext<IGraphQLContext>();
      // as the default behaviour we resolve to null if the field is nullable
      if (options.resolveToNull === undefined) {
        const info: GraphQLResolveInfo = context.getArgByIndex(3);

        if (info) {
          const fieldName = info.fieldName;
          const field = info.parentType.getFields()[fieldName];

          options.resolveToNull = !isNonNullType(field.type);
        }
      }

      return ctx[DATA_LOADER_CTX_INJECT_TOKEN].get(innerCreatorRef, options);
    }
  )(creatorRef);
}
