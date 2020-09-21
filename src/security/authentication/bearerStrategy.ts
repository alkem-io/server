import { Request } from 'express';
import { BearerStrategy } from 'passport-azure-ad'
import { User } from '../../models'
import { AADConnectionFactory } from './aad-connection-factory';
import { IExtendedTokenPayload } from './IExtendedTokenPayload';

export const bearerStrategy = new BearerStrategy( AADConnectionFactory.GetOptions(),
  async (req: Request, token: IExtendedTokenPayload, done: CallableFunction) => {

    try {

      if (!token.oid) throw 'token oid missing'
      if (!token.email) throw 'token email missing'

      const knownUser = await User.findOne({ email: token.email })
      if (knownUser) return done(null, knownUser, token)

      return done('User not found!');

    } catch (error) {
      console.error(`Failed adding the user to the request object: ${error}`);
      done(`Failed adding the user to the request object: ${error}`);
    }
  }
)