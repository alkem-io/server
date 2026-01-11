// This file exports mock data for ActorContext for testing purposes.
// It uses the ActorContext class for type safety and correct enum usage.
import { ActorContext } from '@core/actor-context';
import { AuthorizationCredential } from '@common/enums/authorization.credential';

export const actorContextData: { actorContext: ActorContext } = {
  actorContext: {
    isAnonymous: false,
    actorId: '91b7e044-61ff-468b-a705-1672b0bda510',
    guestName: undefined,
    credentials: [
      {
        resourceID: '',
        type: AuthorizationCredential.GLOBAL_ADMIN,
      },
    ],
    authenticationID: '',
  },
};
