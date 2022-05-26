import { ObjectType } from '@nestjs/graphql';
import { ITemplateBase } from '../template-base/template.base.interface';

@ObjectType('AspectTemplate2')
export abstract class IAspectTemplate extends ITemplateBase {}
