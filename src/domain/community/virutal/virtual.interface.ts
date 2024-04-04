import { Field, ObjectType } from '@nestjs/graphql';
import { IContributor } from '../contributor/contributor.interface';

@ObjectType('Virtual')
export class IVirtual extends IContributor {
  @Field(() => String, {
    nullable: true,
    description: 'The prompt being used by this Virtual',
  })
  prompt!: string;
}
