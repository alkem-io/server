export class UpdateProfileSelectTagsetInput {
  profileID!: string;
  tagsetName!: string;

  tags?: string[];

  defaultSelectedValue?: string;

  allowedValues?: string[];
}
