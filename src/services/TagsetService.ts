import { Tagset } from '../models';
import { Service } from 'typedi';

@Service('TagsetService')
export class TagsetService {

  public async getTagset(id: number): Promise<Tagset | undefined> {
    const tagset = await Tagset.findOne({ where: { id } });
    return tagset;
  }
}
