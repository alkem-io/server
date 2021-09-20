import { DeleteBaseAlkemioInput } from '@domain/common/entity/base-entity/base.alkemio.dto.delete';
import { InputType } from '@nestjs/graphql';

@InputType()
export class DeleteOpportunityInput extends DeleteBaseAlkemioInput {}
