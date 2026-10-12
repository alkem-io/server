import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('AdminTemplateForeignFileReference', {
  description:
    'A file a template references that is stored outside the template entity referencing it.',
})
export class AdminTemplateForeignFileReference {
  @Field()
  templateID!: string;

  @Field()
  templateName!: string;

  @Field({
    description:
      'Where in the template the reference sits, e.g. profileDescription, visualUri, linkUri, whiteboard.',
  })
  location!: string;

  @Field({ description: 'The entity holding the reference.' })
  entityID!: string;

  @Field()
  fileID!: string;

  @Field({ description: 'The bucket the file is stored in today.' })
  storageBucketID!: string;

  @Field({
    description:
      "Whether the template's owner can read the file. Only such files are copied; any other stays referenced as written.",
  })
  ownerCanRead!: boolean;

  @Field({ description: 'Whether this run copied the file into the template.' })
  copied!: boolean;
}

@ObjectType('AdminTemplateFileRepairIssue')
export class AdminTemplateFileRepairIssue {
  @Field()
  templateID!: string;

  @Field()
  location!: string;

  @Field()
  entityID!: string;

  @Field()
  reason!: string;
}

@ObjectType('AdminTemplateFileRepairResult')
export class AdminTemplateFileRepairResult {
  @Field()
  dryRun!: boolean;

  @Field(() => Int)
  templatesScanned!: number;

  @Field(() => Int)
  templatesWithForeignFiles!: number;

  @Field(() => [AdminTemplateForeignFileReference])
  references!: AdminTemplateForeignFileReference[];

  @Field(() => Int)
  copiedReferences!: number;

  @Field(() => [AdminTemplateFileRepairIssue])
  failed!: AdminTemplateFileRepairIssue[];
}
