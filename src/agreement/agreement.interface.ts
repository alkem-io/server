import { ITag } from "src/tag/tag.interface";

export interface IAgreement {
  id: number;
  name: string;
  description?: string;
  tags?: ITag[];
}
