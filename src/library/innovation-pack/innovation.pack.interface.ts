import { ObjectType } from '@nestjs/graphql';
import { ITemplatesSet } from '@domain/template/templates-set';
import { INameableOld } from '@domain/common/entity/nameable-entity/nameable.interface.old';

@ObjectType('InnovatonPack')
export abstract class IInnovationPack extends INameableOld {
  templatesSet?: ITemplatesSet;
}
