export type Identifiable = { id: string };

export type InnovationFlow = Identifiable & {
  states: {
    displayName: string;
    description: string;
  }[];
  settings: {
    minimumNumberOfStates: number;
    maximumNumberOfStates: number;
  };
  currentState: { displayName: string; description: string };
  flowStatesTagsetTemplateId: string;
  tagsetTemplate: TagsetTemplate;
};

export type TagsetTemplate = Identifiable & {
  name: string;
  type: string;
  allowedValues: string;
  defaultSelectedValue: string;
  tagsetTemplateSetId: string;
};

export type Collaboration = Identifiable & {
  calloutsSetId: string;
  isTemplate: boolean;
  innovationFlowId: string;
  innovationFlow: InnovationFlow;
};

export type KnowledgeBase = Identifiable & {
  calloutsSetId: string;
  profileId: string;
};

export type CalloutsSet = Identifiable & {
  type: string;
  tagsetTemplateSetId: string;
};

export type ClassificationTagset = Identifiable & {
  name: string;
  tags: string;
  profileId: string;
  tagsetTemplateId: string;
  type: string;
  classificationId: string;
};

export type Callout = Identifiable & {
  nameID: string;
  sortOrder: number;
  isTemplate: boolean;
  framingId: string;
  classificationId: string;
};

export function hasDuplicates(array: any[]): boolean {
  const uniqueElements = new Set();
  for (const element of array) {
    if (uniqueElements.has(element)) {
      return true;
    }
    uniqueElements.add(element);
  }
  return false;
}

export function equalClassificationTagsets(
  tagsetA: ClassificationTagset,
  tagsetB: ClassificationTagset
): boolean {
  return (
    tagsetA.name === tagsetB.name &&
    tagsetA.tags === tagsetB.tags &&
    tagsetA.profileId === tagsetB.profileId &&
    tagsetA.tagsetTemplateId === tagsetB.tagsetTemplateId &&
    tagsetA.type === tagsetB.type &&
    tagsetA.classificationId === tagsetB.classificationId
  );
}

/**
 * creates an array of numbers from 1 to n
 * @param n
 * @returns [1, 2, 3, ..., n]
 */
export function createSequence(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}
