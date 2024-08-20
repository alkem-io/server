export class AiServerAdapterAskQuestionInput {
  question!: string;
  aiPersonaServiceID!: string;
  contextID?: string;
  userID?: string;
  threadID?: string;
  vcInteractionID?: string;
  description?: string;
  displayName!: string;
}
