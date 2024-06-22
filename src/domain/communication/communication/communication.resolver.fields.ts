import { Resolver } from '@nestjs/graphql';
import { ICommunication } from './communication.interface';

@Resolver(() => ICommunication)
export class CommunicationResolverFields {
  constructor() {}
}
