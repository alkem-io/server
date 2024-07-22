import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { SearchVisibility } from '@common/enums/search.visibility';

@InputType()
export class UpdateInnovationPackInput extends UpdateNameableInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Flag to control the visibility of the InnovationPack in the platform Library.',
  })
  @IsOptional()
  listedInStore?: boolean;

  @Field(() => SearchVisibility, {
    description: 'Visibility of the InnovationPack in searches.',
    nullable: true,
  })
  @IsOptional()
  searchVisibility?: SearchVisibility;
}
