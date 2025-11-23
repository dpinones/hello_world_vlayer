// V2: Registration data (2 fields)
export type RegistrationData = {
  campaignId: string;
  handleTiktok: string;
};

// V2: Submission data (4 fields)
export type SubmissionData = {
  campaignId: string;
  handleTiktok: string;
  scoreCalidad: number;
  urlVideo: string;
};

// V1 compatibility
export type CampaignData = SubmissionData;

// V2: Campaign states
export enum CampaignState {
  Registration = 0,
  WaitingForProofs = 1,
  Claimable = 2
}

// V2: Registration proof
export type RegistrationProof = {
  zkProof: `0x${string}`;
  journalDataAbi: `0x${string}`;
  registrationData: RegistrationData;
};

// V2: Submission proof
export type SubmissionProof = {
  zkProof: `0x${string}`;
  journalDataAbi: `0x${string}`;
  submissionData: SubmissionData;
};

// V1 compatibility
export type ZKProofNormalized = SubmissionProof & {
  campaignData: CampaignData;
};

export type ProveResult = { type: "prove"; data: any };
export type VerifyResult = { type: "verify"; data: any & { campaignData?: CampaignData } };
export type OnchainResult = { type: "onchain"; data: any };
export type PageResult = ProveResult | VerifyResult | OnchainResult;


