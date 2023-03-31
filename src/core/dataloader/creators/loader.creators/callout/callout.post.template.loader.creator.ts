import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Callout } from '@domain/collaboration/callout';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { IPostTemplate } from '@domain/template/post-template/post.template.interface';

@Injectable()
export class CalloutPostTemplateLoaderCreator
  implements DataLoaderCreator<IPostTemplate>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IPostTemplate>) {
    return createTypedRelationDataLoader(
      this.manager,
      Callout,
      { postTemplate: true },
      this.constructor.name,
      options
    );
  }
}
