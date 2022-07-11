import { Resolver } from '@nestjs/graphql';
import { IEcosystemModel } from './ecosystem-model.interface';
@Resolver(() => IEcosystemModel)
export class EcosystemModelResolverFields {}
