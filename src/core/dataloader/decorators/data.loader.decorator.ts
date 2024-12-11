import { isNonNullType } from 'graphql/type';
import { createParamDecorator, ExecutionContext, Type } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '../data.loader.inject.token';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../creators/base';

export function Loader<TParent, TReturn>(
  creatorRef: Type<DataLoaderCreator<TReturn>>,
  options: DataLoaderCreatorOptions<TReturn, TParent> = {}
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
        const info = context.getArgByIndex(3);
        const fieldName = info.fieldName;
        const field = info.parentType.getFields()[fieldName];

        options.resolveToNull = !isNonNullType(field.type);
        console.log(info.parentType.name, fieldName, options.resolveToNull);
      }

      return ctx[DATA_LOADER_CTX_INJECT_TOKEN].get(innerCreatorRef, options);
    }
  )(creatorRef);
}
