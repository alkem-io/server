import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { ITemplate } from '../template/template.interface';
import { IWhiteboardTemplate } from '../whiteboard-template/whiteboard.template.interface';

@ObjectType('TemplatesSet')
export abstract class ITemplatesSet extends IAuthorizable {
  templates!: ITemplate[];

  whiteboardTemplates!: IWhiteboardTemplate[];
}
