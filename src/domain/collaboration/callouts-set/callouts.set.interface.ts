import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ITagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ICallout } from '../callout/callout.interface';
import { ICollaboration } from '../collaboration';

@ObjectType('CalloutsSet')
export abstract class ICalloutsSet extends IAuthorizable {
  collaboration?: ICollaboration;

  callouts!: ICallout[];

  tagsetTemplateSet?: ITagsetTemplateSet;

  @Field(() => CalloutsSetType, {
    nullable: false,
    description: 'The set of CalloutGroups in use in this CalloutsSet.',
  })
  type!: CalloutsSetType;
}
