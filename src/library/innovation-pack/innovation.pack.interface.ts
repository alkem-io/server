import { ObjectType } from '@nestjs/graphql';
import { ITemplatesSet } from '@domain/template/templates-set';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';

@ObjectType('InnovatonPack')
export abstract class IInnovationPack extends INameable {
  templatesSet?: ITemplatesSet;
}
