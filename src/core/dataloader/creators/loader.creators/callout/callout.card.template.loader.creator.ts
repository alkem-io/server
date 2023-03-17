import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IAspectTemplate } from '@domain/template/aspect-template/aspect.template.interface';
import { Callout } from '@domain/collaboration/callout';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class CalloutCardTemplateLoaderCreator
  implements DataLoaderCreator<IAspectTemplate>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IAspectTemplate>) {
    return createTypedRelationDataLoader(
      this.manager,
      Callout,
      { cardTemplate: true },
      this.constructor.name,
      options
    );
  }
}
