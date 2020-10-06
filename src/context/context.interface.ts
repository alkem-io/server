import { IReference } from "src/reference/reference.interface";
import { ITag } from "src/tag/tag.interface";

export interface IContext {
  id: number;
  tagline?: string;
  background?: string;
  vision?: string;
  impact?: string;
  who?: string;
  references?: IReference[];
  tags?: ITag[];
}
