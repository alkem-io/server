import { createParamDecorator, ExecutionContext, Type } from '@nestjs/common';
import { IDataLoader } from '@core/dataloader/data.loader.interface';
import { GqlExecutionContext } from '@nestjs/graphql';

export const Loader = createParamDecorator(
  async (dataLoaderRef: Type<IDataLoader<any, any>>, context: ExecutionContext & { [key: string]: any }) => {
    const ctx: any = GqlExecutionContext.create(context).getContext();

    if (ctx[dataLoaderRef]) {

    }
  }