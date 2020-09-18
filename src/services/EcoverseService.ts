import { Service } from 'typedi';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';
import { Ecoverse } from '../models';
import { IEcoverse } from 'src/interfaces/IEcoverse';
import { IContext } from 'src/interfaces/IContext';
import { IOrganisation } from 'src/interfaces/IOrganisation';
import { IUserGroup } from 'src/interfaces/IUserGroup';

@Service('EcoverseService')
export class EcoverseService {
  constructor(
      @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public async getEcoverse(): Promise<IEcoverse> {
    try {

      const ecoverse = await Ecoverse.getInstance();
      this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

      return ecoverse;
    } catch (e) {
        this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getEcoverse()!!!', exception: e});
      throw e;
    }
  }

  public async getName(): Promise<string> {
    try {

      const ecoverse = await Ecoverse.getInstance();
      this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

      return ecoverse.name;
    } catch (e) {
        this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getName()!!!', exception: e});
      throw e;
    }
  }

  public async getMembers(): Promise<IUserGroup> {
    try {

        const ecoverse = await Ecoverse.getInstance();
        const membersGroup = ecoverse.groups?.find(_ => _.name === 'members');

        this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

        return membersGroup as IUserGroup;


    } catch (e) {
        this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getMembers()!!!', exception: e});
      throw e;
    }
  }

  public async getContext(): Promise<IContext> {
    try {

        const ecoverse = await Ecoverse.getInstance();
        this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

        return ecoverse.context as IContext;

    } catch (e) {
        this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getContext()!!!', exception: e});
      throw e;
    }
  }

  public async getHost(): Promise<IOrganisation> {
    try {

        const ecoverse = await Ecoverse.getInstance();
        this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

        return ecoverse.host as IOrganisation;

    } catch (e) {
        this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getHost()!!!', exception: e});
      throw e;
    }
  }

}