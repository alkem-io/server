import { BearerStrategy, ITokenPayload } from 'passport-azure-ad'
import { User } from '../models'
import { config } from './config'

export const bearerStrategy = new BearerStrategy( config,
  async (token: ITokenPayload, done: CallableFunction) => {
    try {

      console.log('verifying the user');
      console.log(token, 'was the token retreived');

      if (!token.oid) throw 'token oid missing'

      const knownUser = await User.findOne({ email: token.upn })
      if (knownUser) return done(null, knownUser, token)

      // const user = new User('')
      // user.email = token.oid
      // user.name = (token as any).preferred_username
      // const newAccount = await account.save()
      // return done(null, newAccount, token)
    } catch (error) {
      console.error(`Failed adding the user to the request object: ${error}`)
    }
  }
)