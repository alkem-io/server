import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IVisual } from '@domain/common/visual/visual.interface';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Aspect')
export abstract class IAspect extends IAuthorizable {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  type!: string;

  createdBy!: string;

  banner?: IVisual;
  bannerNarrow?: IVisual;

  discussion?: IDiscussion;
}
