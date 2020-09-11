import { Service } from 'typedi';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';
import { Ecoverse, UserGroup } from '../models';
import { IEcoverse } from 'src/interfaces/IEcoverse';
import { IUser } from 'src/interfaces/IUser';
import { In, createQueryBuilder } from 'typeorm';
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

  public async getMembers(): Promise<IUser[]> {
    try {

        const ecoverse = await Ecoverse.getInstance();
        const membersGroup = ecoverse.groups?.find(x => x.name === 'members');
        return membersGroup?.members as IUser[];
        // const ecoverse = await createQueryBuilder('Ecoverse')
        // .leftJoinAndSelect('user_group', 'user_group', 'user_group.ecoverseId = ecoverse.id')
        // .where('user_group.name = :name', { name: 'members'} )
        // .leftJoinAndSelect('user_group_members_user', 'members', 'user_group_members_user.userGroupId = user_group.id')
        // .leftJoinAndSelect('user', 'user', 'user.id = user_group_members_user.userId')
        // .getMany();

        // ecoverse.members = ecoverse?.groups?.find( { where: { name: 'members'} } )
    //   const userGroup = await UserGroup.getRepository();
    //   this.eventDispatcher.dispatch(events.ecoverse.query, { ecoverse: ecoverse });

    //    const members = await userGroup.findOne({
    //       where: { name: 'members'}
    //     })

    } catch (e) {
        this.eventDispatcher.dispatch(events.logger.error, { message: 'Something went wrong in getName()!!!', exception: e});
      throw e;
    }
  }

}