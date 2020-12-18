import { ObjectType, Field } from '@nestjs/graphql';
import { IScope } from './scope.interface';

@ObjectType()
export class Scope implements IScope {
  @Field(() => [String], { nullable: false, description: 'OpenID Scopes.' })
  scopes: string[];

  constructor(scopes: string[]) {
    this.scopes = scopes;
  }
}
