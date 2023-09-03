import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutFraming')
export abstract class ICalloutFraming extends IAuthorizable {
  @Field(() => IProfile, {
    nullable: false,
    description: 'The Profile for this calloutFraming.',
  })
  profile!: IProfile;
}
