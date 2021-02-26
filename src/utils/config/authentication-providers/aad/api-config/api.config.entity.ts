import { Field, ObjectType } from '@nestjs/graphql';
import { IApiConfig } from './api.config.interface';

@ObjectType()
export class ApiConfig implements IApiConfig {
  @Field(() => String, {
    nullable: false,
    description: 'Configuration payload for the Cherrytwist API.',
  })
  resourceScope: string;

  constructor(resourceScope: string) {
    this.resourceScope = resourceScope;
  }
}
