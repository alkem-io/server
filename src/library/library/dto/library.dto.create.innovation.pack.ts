import { UUID } from '@domain/common/scalars';
import { CreateInnovationPackInput } from '@library/innovation-pack/dto/innovation.pack.dto.create';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateInnovationPackOnLibraryInput extends CreateInnovationPackInput {
  @Field(() => UUID, { nullable: false })
  libraryID!: string;
}
