import { DeleteBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.delete';
import { InputType } from '@nestjs/graphql';

@InputType()
export class DeleteTemplateInput extends DeleteBaseAlkemioInput {}
