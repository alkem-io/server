import { Field, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class ISearchable {
  @Field()
  includeInSearch!: boolean;
}
