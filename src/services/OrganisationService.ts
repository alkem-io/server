import { Organisation } from '../models';
import { Service } from 'typedi';
import { getRepository } from 'typeorm';

@Service('OrganisationService')
export class OrganisationService {
  private getQuery() {
    return getRepository(Organisation)
      .createQueryBuilder('organisation')
      .leftJoinAndSelect('organisation.groups', 'group');
  }

  public async getOrganisations(): Promise<Organisation[]> {
    return await this.getQuery().getMany();
  }

  public async getOrganisation(id: number): Promise<Organisation | undefined> {
    return await this.getQuery().where('organisation.id = :id', { id }).getOne();
  }
}
