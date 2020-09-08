import { Arg, Mutation, Resolver } from 'type-graphql';
import { ChallengeInput, ContextInput, OrganisationInput, TagInput, UserGroupInput, UserInput } from '../inputs';
import { Challenge, Context, Organisation, Tag, User, UserGroup } from '../../models'

@Resolver()
export class CreateMutations {


    @Mutation(() => Context)
    async createContext(
        @Arg('contextData') contextData: ContextInput): Promise<Context> {
        const context = Context.create(contextData);
        await context.save();

        return context;
    }

    @Mutation(() => User)
    async createUser(
        @Arg('userData') userData: UserInput): Promise<User> {
        const user = User.create(userData);
        await user.save();

        return user;
    }

    @Mutation(() => UserGroup)
    async createUserGroup(
        @Arg('userGroupData') userGroupData: UserGroupInput): Promise<UserGroup> {
        const userGroup = UserGroup.create(userGroupData);
        await userGroup.save();

        return userGroup;
    }

    @Mutation(() => Organisation)
    async createOrganisation(
        @Arg('organisationData') organisationData: OrganisationInput): Promise<Organisation> {
        const organisation = Organisation.create(organisationData);
        await organisation.save();

        return organisation;
    }

    @Mutation(() => Challenge)
    async createChallenge(
        @Arg('challengeData') challengeData: ChallengeInput): Promise<Challenge> {
        const challenge = Challenge.create(challengeData);
        await challenge.save();

        return challenge;
    }

    @Mutation(() => Tag)
    async createTag(
        @Arg('tagData') tagData: TagInput): Promise<Tag> {
        const tag = Tag.create(tagData);
        await tag.save();

        return tag;
    }

}