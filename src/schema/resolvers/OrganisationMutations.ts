import { ApolloError } from 'apollo-server-express';
import { Arg, Mutation, Resolver } from 'type-graphql';
import { Container } from 'typedi';
import { AddGroupToOrganisationInput } from '..';
import { Organisation, UserGroup } from '../../models';
import { OrganisationService } from '../../services/OrganisationService';

@Resolver()
export class OrganisationMutations {
  @Mutation(() => Organisation)
  async addGroupToOrganisation(
    @Arg('organisationData') organisationData: AddGroupToOrganisationInput
  ): Promise<Organisation> {
    const { organisationId, groupName } = organisationData;

    const organisationService = Container.get<OrganisationService>('OrganisationService');
    const organisation = await organisationService.getOrganisation(organisationId);

    if (!organisation) throw new ApolloError('Organisation not found!');

    if ((await UserGroup.count({ where: { name: groupName } })) !== 0)
      throw new ApolloError(`Group with name '${groupName}' already exists.`);

    organisation.groups?.push(new UserGroup(groupName));
    await organisation.save();

    return organisation;
  }
}
