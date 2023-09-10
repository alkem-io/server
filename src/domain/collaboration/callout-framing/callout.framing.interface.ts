import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';

@ObjectType('CalloutFraming')
export abstract class ICalloutFraming extends IAuthorizable {
  profile!: IProfile;

  @Field(() => JSON, {
    nullable: true,
    description: 'The whiteboard template content for this Callout Framing.',
  })
  content?: string;
}
