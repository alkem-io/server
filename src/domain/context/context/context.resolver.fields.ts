import { IContext } from '@domain/context/context';
import { Resolver } from '@nestjs/graphql';

@Resolver(() => IContext)
export class ContextResolverFields {
  constructor() {}
}
