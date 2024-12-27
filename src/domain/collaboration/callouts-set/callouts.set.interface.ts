import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { ICallout } from '../callout/callout.interface';
import { ITagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.interface';

@ObjectType('CalloutsSet')
export abstract class ICalloutsSet extends IAuthorizable {
  callouts!: ICallout[];

  tagsetTemplateSet?: ITagsetTemplateSet;

  groupsStr!: string;
}
