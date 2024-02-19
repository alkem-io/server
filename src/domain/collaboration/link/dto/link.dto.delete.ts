import { InputType } from '@nestjs/graphql';
import { DeleteBaseAlkemioInput } from '@domain/common/entity/base-entity';

@InputType()
export class DeleteLinkInput extends DeleteBaseAlkemioInput {}
