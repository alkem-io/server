export interface ITagsetTemplate {
  name: string;
  placeholder?: string;
}
export interface IUserTemplate {
  name: string;
  tagsets?: ITagsetTemplate[];
}
