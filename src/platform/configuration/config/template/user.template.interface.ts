export interface ITagsetTemplate {
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
  tagsets?: ITagsetTemplate[];
  references?: IReferenceTemplate[];
}
