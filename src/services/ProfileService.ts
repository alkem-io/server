import { Profile } from '../models';
import { Service } from 'typedi';

@Service('ProfileService')
export class ProfileService {

  public async getProfile(id: number): Promise<Profile | undefined> {
    const profile = await Profile.findOne({ where: { id } });
    return profile;
  }
}
