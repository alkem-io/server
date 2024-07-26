import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IProfile } from '../profile/profile.interface';

@ObjectType('Reference')
export abstract class IReference extends IAuthorizable {
  @Field(() => String, {
    nullable: false,
    description: 'Name of the reference, e.g. Linkedin, Twitter etc.',
  })
  name!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URI of the reference',
  })
  uri!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Description of this reference',
  })
  description?: string;

  profile?: IProfile;
}
