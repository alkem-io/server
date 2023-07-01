export interface ITagsetTemplateOld {
  name: string;
  placeholder?: string;
}

export interface IReferenceTemplate {
  name: string;
  description: string;
  uri: string;
}
export interface IUserTemplate {
  name: string;
  references?: IReferenceTemplate[];
}
