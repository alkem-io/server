import { Service } from 'typedi';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';
import { IUserGroup } from 'src/interfaces/IUserGroup';
import { Challenge, RestrictedGroupNames } from '../models';

@Service('ChallengeService')
export class ChallengeService {
  constructor(@EventDispatcher() private eventDispatcher: EventDispatcherInterface) {}

  public async getMembers(id: number): Promise<IUserGroup> {
    try {
      const challenge = await Challenge.findOne({ where: { id } });
      if (challenge === undefined) {
        this.eventDispatcher.dispatch(events.logger.error, { message: 'No challenge found with that challengeId!' });
      }
      if (challenge?.groups === undefined) {
        this.eventDispatcher.dispatch(events.logger.error, { message: 'No groups found with that challengeId!' });
      }

      const membersGroup = challenge?.groups?.find(_ => _.name === RestrictedGroupNames.Members);
      this.eventDispatcher.dispatch(events.challenge.query, { challenge: challenge });

      return membersGroup as IUserGroup;
    } catch (e) {
      this.eventDispatcher.dispatch(events.logger.error, {
        message: 'Something went wrong in getMembers()!!!',
        exception: e,
      });
      throw e;
    }
  }
}
