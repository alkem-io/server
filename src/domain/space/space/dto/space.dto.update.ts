import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { UpdateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class UpdateSpaceInput extends UpdateBaseAlkemioInput {
  @Field(() => UpdateSpaceAboutInput, {
    nullable: true,
    description: 'Update the Space About information.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSpaceAboutInput)
  about?: UpdateSpaceAboutInput;

  /**
   * 027-platform-role-redesign (T078, FR-020, A17) — the PROTECTED SECTION of
   * this input. Supplying `nameID` makes the mutation require `UPDATE_NAMEID`
   * IN ADDITION to the ordinary `UPDATE` its other fields need: renaming
   * repoints every inbound link to the space, so it may not ride an ordinary
   * field edit. Leaving it absent leaves the mutation exactly as it was.
   */
  @Field(() => NameID, {
    nullable: true,
    description:
      'Update the URL path (nameID) for the Space. Protected: additionally requires the UPDATE_NAMEID privilege.',
  })
  @IsOptional()
  nameID?: string;
}
