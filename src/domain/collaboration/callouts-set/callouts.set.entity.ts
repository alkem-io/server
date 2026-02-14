import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { TagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.entity';
import { Callout } from '../callout/callout.entity';
import { Collaboration } from '../collaboration/collaboration.entity';
import { ICalloutsSet } from './callouts.set.interface';

export class CalloutsSet extends AuthorizableEntity implements ICalloutsSet {
  collaboration?: Collaboration;

  callouts!: Callout[];

  tagsetTemplateSet?: TagsetTemplateSet;

  type!: CalloutsSetType;
}
