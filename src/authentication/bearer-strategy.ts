import { Request } from 'express';
import { BearerStrategy } from 'passport-azure-ad'
import { User } from '../models'
import { config } from './config'
import { IExtendedTokenPayload } from './IExtendedTokenPayload';

export const bearerStrategy = new BearerStrategy( config,
  async (req: Request, token: IExtendedTokenPayload, done: CallableFunction) => {
    try {

      console.log(req);
      console.log('verifying the user');
      console.log(token, 'was the token retreived');

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