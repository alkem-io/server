import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { IAspectTemplate } from '../aspect-template/aspect.template.interface';
import { ICanvasTemplate } from '../canvas-template/canvas.template.interface';
import { ILifecycleTemplate } from '../lifecycle-template/lifecycle.template.interface';

@ObjectType('TemplatesSet')
export abstract class ITemplatesSet extends IAuthorizable {
  aspectTemplates?: IAspectTemplate[];

  canvasTemplates?: ICanvasTemplate[];

  lifecycleTemplates?: ILifecycleTemplate[];

  policy!: string;
}
