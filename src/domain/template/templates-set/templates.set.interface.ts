import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { IAspectTemplate } from '../aspect-template/aspect.template.interface';
import { ICanvasTemplate } from '../canvas-template/canvas.template.interface';

@ObjectType('TemplatesSet')
export abstract class ITemplatesSet extends IAuthorizable {
  aspectTemplates?: IAspectTemplate[];

  canvasTemplates?: ICanvasTemplate[];
}
