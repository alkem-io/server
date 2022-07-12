import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { ObjectType } from '@nestjs/graphql';
import { ICanvas } from '@domain/common/canvas';
import { INameable } from '@domain/common';

@ObjectType('Callout')
export abstract class ICallout extends INameable {
  aspects?: IAspect[];
  canvases?: ICanvas[];
}
