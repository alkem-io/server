import { CreateInnovationPackInput } from '@library/innovation-pack/dto/innovation.pack.dto.create';
import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateInnovationPackOnLibraryInput extends CreateInnovationPackInput {}
