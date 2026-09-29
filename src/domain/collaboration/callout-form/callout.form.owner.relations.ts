import { FindOptionsRelations } from 'typeorm';
import { Callout } from '../callout/callout.entity';

/**
 * What the access and moderation checks need from the Post that owns a Form:
 * the Post's own authorization, the callouts set (authorization + type) for
 * moderation, and the space roleSet for the read-all audience.
 */
export const CALLOUT_FORM_OWNER_RELATIONS: FindOptionsRelations<Callout> = {
  authorization: true,
  framing: { profile: true },
  calloutsSet: {
    authorization: true,
    collaboration: {
      space: {
        community: {
          roleSet: true,
        },
      },
    },
  },
};
