export type GuidanceUsage = {
  // todo jsdoc
  usage: {
    /**
     * The input
     */
    question: string;
    /**
     * The answer
     */
    answer: string;
    /**
     * Sources on which the answer is based on
     */
    sources: string[]; // todo
    /**
     * Amount of tokens which you used for the prompt; int
     */
    promptTokens: number;
    /**
     * Amount of tokens which you used for the answer; int
     */
    completionTokens: number;
    /**
     * Total tokens; int
     */
    totalTokens: number;
    /**
     * Cost in US dollars; float
     */
    totalCost: number;
  };
  author: {
    id: string;
    email: string;
  };
};
