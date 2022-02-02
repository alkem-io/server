import { INameable } from '@domain/common';
import { IReference } from '@domain/common/reference/reference.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Aspect')
export abstract class IAspect extends INameable {
  @Field(() => String)
  description!: string;

  @Field(() => String)
  type!: string;

  createdBy!: string;

  banner?: IVisual;
  bannerNarrow?: IVisual;

  discussion?: IDiscussion;

  references?: IReference[];
}
