import { Field, ObjectType } from '@nestjs/graphql';
import { IMatrixAuthProviderConfig } from './matrix.provider.config.interface';

@ObjectType()
export class MatrixAuthProviderConfig implements IMatrixAuthProviderConfig {
  @Field(() => String, {
    nullable: false,
    description: 'The base url endpoint for the synapse server',
  })
  baseUrl?: string;

  @Field(() => String, {
    nullable: false,
    description: 'The base identity server url',
  })
  idBaseUrl?: string;

  @Field(() => String, {
    nullable: false,
    description:
      'A secret shared between the client and the synapse server allowing user registration',
  })
  sharedSecret?: string;
}
