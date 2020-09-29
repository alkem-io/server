import { ApolloError } from 'apollo-server-express';
import { Organisation, UserGroup } from '../../models';
import { OrganisationService } from '../../services/OrganisationService';
import { Arg, Mutation, Resolver } from 'type-graphql';
import { Container } from 'typedi';
import { AddGroupToOrganisationInput } from '../inputs/OrganisationInput';

@Resolver()
export class OrganisationMutations {

  @Mutation(() => Organisation)
  async addGroupToOrganisation(
    @Arg('organisationData') organisationData: AddGroupToOrganisationInput): Promise<Organisation> {
    const organisationService = Container.get<OrganisationService>('OrganisationService');
    const { organisationId, groupId, group } = organisationData;
    const organisation = await organisationService.getOrganisation(organisationId);

    // TODO [ATS] Move the Add code in the OrganisationService
    if (!organisation) throw new ApolloError('Organisation not found!');

    if (groupId) {
      const userGroup = await UserGroup.findOne(groupId);
      if (userGroup) {
        organisation.groups?.push(userGroup);
        await organisation.save();
        return organisation;
      }
      else {
        throw new ApolloError('Group not found!');
      }
    }

    if (group) {
      if (await UserGroup.count({ where: { name: group.name } }) !== 0)
        throw new ApolloError(`Group with name '${group.name}' already exists.`);

      const userGroup = UserGroup.create(group);
      organisation.groups?.push(userGroup);
      await organisation.save();
    }

    return organisation;
  }
}