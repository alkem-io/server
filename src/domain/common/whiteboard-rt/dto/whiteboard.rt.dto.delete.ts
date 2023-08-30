import { DeleteBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { InputType } from '@nestjs/graphql';

@InputType()
export class DeleteWhiteboardRtInput extends DeleteBaseAlkemioInput {}
