export class UpdateProfileSelectTagsetDefinitionInput {
  profileID!: string;

  tagsetName!: string;

  defaultSelectedValue?: string;

  allowedValues!: string[];

  // To allow for updating from one value to a new one
  oldSelectedValue?: string;
  newSelectedValue?: string;
}
