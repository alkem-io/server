import { challengeDataTest } from '../common-params';

export const createChallengMut = `
mutation createChallenge($challengeData: CreateChallengeInput!) {
  createChallenge(challengeData: $challengeData) {
    ${challengeDataTest}
  }
}`;
