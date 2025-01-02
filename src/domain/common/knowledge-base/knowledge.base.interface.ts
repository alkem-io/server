import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ObjectType } from '@nestjs/graphql';
import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';

@ObjectType('KnowledgeBase')
export abstract class IKnowledgeBase extends IAuthorizable {
  profile!: IProfile;

  calloutsSet?: ICalloutsSet;
}
