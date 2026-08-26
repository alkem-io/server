import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsUUID } from 'class-validator';

@InputType({ isAbstract: true })
abstract class CreateWhiteboardDraftInputBase {
  @Field(() => UUID, { nullable: true })
  @IsOptional()
  @IsUUID()
  sourceWhiteboardID?: string;

  @Field(() => UUID, { nullable: true })
  @IsOptional()
  @IsUUID()
  sourceCalloutID?: string;
}

@InputType()
export class CreateWhiteboardDraftOnCalloutsSetInput extends CreateWhiteboardDraftInputBase {
  @Field(() => UUID)
  @IsUUID()
  calloutsSetID!: string;
}

@InputType()
export class CreateWhiteboardDraftOnTemplatesSetInput extends CreateWhiteboardDraftInputBase {
  @Field(() => UUID)
  @IsUUID()
  templatesSetID!: string;
}

export type CreateWhiteboardDraftInput = CreateWhiteboardDraftInputBase;
