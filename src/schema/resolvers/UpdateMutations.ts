import { Arg, Mutation, Resolver } from 'type-graphql';
import { UpdateRootUserInput, UpdateRootUserGroupInput, UpdateRootOrganisationInput, UpdateRootChallengeInput, UpdateEcoverseInput, UpdateRootContextInput } from '../inputs';
import { Challenge, Organisation, User, UserGroup, Ecoverse, Context } from '../../models'

@Resolver()
export class UpdateMutations {

    @Mutation(() => Ecoverse)
    async updateEcoverse(
        @Arg('ecoverseData') ecoverseData: UpdateEcoverseInput): Promise<Ecoverse>{

            await Ecoverse.getInstance();
            const ecoverse = Ecoverse.create(ecoverseData);
            await ecoverse.save();

            throw new Error ('Entitiy not found!');

    }

    @Mutation(() => User)
    async updateUser(
        @Arg('userData') userData: UpdateRootUserInput): Promise<User>{
            if( User.findOne( { where: { userData } } ) )
            {
                const user = User.create(userData);
                await user.save();

                return user;

            }

            throw new Error ('Entitiy not found!');

    }

    @Mutation(() => UserGroup)
    async updateUserGroup(
        @Arg('userGroupData') userGroupData: UpdateRootUserGroupInput): Promise<UserGroup> {

            if( User.findOne( { where: { userGroupData } } ) )
            {
                const userGroup = UserGroup.create(userGroupData);
                await userGroup.save();

                return userGroup;

            }

            throw new Error ('Entitiy not found!');

    }

    @Mutation(() => Organisation)
    async updateOrganisation(
        @Arg('organisationData') organisationData: UpdateRootOrganisationInput): Promise<Organisation> {
            if( User.findOne( { where: { organisationData } } ) )
            {
                const organisation = Organisation.create(organisationData);
                await organisation.save();

                return organisation;

            }

            throw new Error ('Entitiy not found!');
    }

    @Mutation(() => Challenge)
    async updateChallenge(
        @Arg('challengeData') challengeData: UpdateRootChallengeInput): Promise<Challenge> {
            if( User.findOne( { where: { challengeData } } ) )
            {
                const challenge = Challenge.create(challengeData);
                await challenge.save();

                return challenge;

            }

            throw new Error ('Entitiy not found!');
    }

    @Mutation(() => Context)
    async updateContext(
        @Arg('contextData') contextData: UpdateRootContextInput): Promise<Context> {
            if( User.findOne( { where: { contextData } } ) )
            {
                const context = Context.create(contextData);
                await context.save();

                return context;

            }

            throw new Error ('Entitiy not found!');
    }

}