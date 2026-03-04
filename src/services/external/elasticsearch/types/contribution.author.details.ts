export type ContributionAuthorDetails = {
  /**
   * Id of the user when not anonymous or guest
   */
  author?: string;
  anonymous: boolean;

  /**
   * Someone who is not a user but has contributed to whiteboards or memos in an anonymous way,
   * so we have a guestName
   */
  guest: boolean;
  guestName?: string;
  alkemio: boolean;
};
