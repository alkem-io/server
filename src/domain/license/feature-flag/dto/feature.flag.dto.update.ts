import { InputType } from '@nestjs/graphql';
import { CreateFeatureFlagInput } from './feature.flag.dto.create';

@InputType()
export abstract class UpdateFeatureFlagInput extends CreateFeatureFlagInput {}
