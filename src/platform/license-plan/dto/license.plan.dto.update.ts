import { InputType } from '@nestjs/graphql';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';

@InputType()
export class UpdateLicensePlanInput extends UpdateBaseAlkemioInput {}
