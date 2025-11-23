// V2: TikTok Campaign Verifier with multi-state support
export const TikTokCampaignVerifierV2Abi = [
  {
    "type": "function",
    "name": "CAMPAIGN_ID",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "advanceState",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setState",
    "inputs": [
      {
        "name": "newState",
        "type": "uint8",
        "internalType": "enum TikTokCampaignVerifierV2.CampaignState"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimReward",
    "inputs": [
      {
        "name": "handleTiktok",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "currentState",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum TikTokCampaignVerifierV2.CampaignState"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCampaignStats",
    "inputs": [],
    "outputs": [
      {
        "name": "registered",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "submitted",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalScoreValue",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "state",
        "type": "uint8",
        "internalType": "enum TikTokCampaignVerifierV2.CampaignState"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRegisteredHandles",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string[]",
        "internalType": "string[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRewardAmount",
    "inputs": [
      {
        "name": "handleTiktok",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasClaimed",
    "inputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isRegistered",
    "inputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "register",
    "inputs": [
      {
        "name": "journalData",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "seal",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "scoresByHandle",
    "inputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "submitCampaign",
    "inputs": [
      {
        "name": "journalData",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "seal",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "totalRegistered",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalScore",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSubmitted",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "InfluencerRegistered",
    "inputs": [
      {
        "name": "handleTiktok",
        "type": "string",
        "indexed": true,
        "internalType": "string"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProofSubmitted",
    "inputs": [
      {
        "name": "handleTiktok",
        "type": "string",
        "indexed": true,
        "internalType": "string"
      },
      {
        "name": "scoreCalidad",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "urlVideo",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RewardClaimed",
    "inputs": [
      {
        "name": "handleTiktok",
        "type": "string",
        "indexed": true,
        "internalType": "string"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StateChanged",
    "inputs": [
      {
        "name": "oldState",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum TikTokCampaignVerifierV2.CampaignState"
      },
      {
        "name": "newState",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum TikTokCampaignVerifierV2.CampaignState"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyClaimed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadySubmitted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidCampaignId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidHandle",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidNotaryKeyFingerprint",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidQueriesHash",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidScore",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidState",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidUrl",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoRewardsAvailable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZKProofVerificationFailed",
    "inputs": []
  }
] as const;

// V1: Legacy ABI
export const TikTokCampaignVerifierAbi = [
  {
    type: "function",
    name: "submitCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "journalData", type: "bytes" },
      { name: "seal", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getScore",
    stateMutability: "view",
    inputs: [
      { name: "handleTiktok", type: "string" },
    ],
    outputs: [
      { name: "", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "CAMPAIGN_ID",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "", type: "string" },
    ],
  },
  {
    type: "event",
    name: "CampaignVerified",
    inputs: [
      { name: "handleTiktok", type: "string", indexed: true },
      { name: "campaignId", type: "string", indexed: true },
      { name: "scoreCalidad", type: "uint256", indexed: false },
      { name: "urlVideo", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
      { name: "blockNumber", type: "uint256", indexed: false },
    ],
  },
  {
    type: "error",
    name: "InvalidNotaryKeyFingerprint",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidQueriesHash",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidUrl",
    inputs: [],
  },
  {
    type: "error",
    name: "ZKProofVerificationFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidScore",
    inputs: [],
  },
  {
    "type": "error",
    "name": "InvalidCampaignId",
    "inputs": [],
  },
] as const;

// Keep old export for backwards compatibility
export const GitHubContributionVerifierAbi = TikTokCampaignVerifierAbi;
