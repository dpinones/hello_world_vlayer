// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRiscZeroVerifier} from "risc0-ethereum/contracts/src/IRiscZeroVerifier.sol";

/// @title TikTokCampaignVerifier
/// @notice Verifies and stores TikTok campaign proofs using ZK proofs from vlayer
/// @dev Uses RISC Zero verifier to validate ZK proofs generated from TikTok API data
contract TikTokCampaignVerifier {
    /// @notice RISC Zero verifier contract
    IRiscZeroVerifier public immutable VERIFIER;

    /// @notice ZK proof program identifier
    /// @dev This should match the IMAGE_ID from your ZK proof program
    bytes32 public immutable IMAGE_ID;

    /// @notice Expected notary key fingerprint from vlayer
    bytes32 public immutable EXPECTED_NOTARY_KEY_FINGERPRINT;

    /// @notice Expected queries hash - validates correct fields are extracted
    /// @dev Computed from the JMESPath queries used to extract campaign data
    bytes32 public immutable EXPECTED_QUERIES_HASH;

    /// @notice Expected URL pattern for TikTok API
    string public expectedUrlPattern;

    /// @notice Fixed campaign ID for this simplified version
    string public constant CAMPAIGN_ID = "cmp_001";

    /// @notice Mapping of handleTiktok => score
    /// @dev Since campaign is fixed to cmp_001, we only need one mapping level
    mapping(string => uint256) public scoresByHandle;

    /// @notice Emitted when a campaign is successfully verified
    event CampaignVerified(
        string indexed handleTiktok,
        string indexed campaignId,
        uint256 scoreCalidad,
        string urlVideo,
        uint256 timestamp,
        uint256 blockNumber
    );

    /// @notice Custom errors
    error InvalidNotaryKeyFingerprint();
    error InvalidQueriesHash();
    error InvalidUrl();
    error ZKProofVerificationFailed();
    error InvalidScore();
    error InvalidCampaignId();

    /// @notice Contract constructor
    /// @param _verifier Address of the RISC Zero verifier contract
    /// @param _imageId ZK proof program identifier (IMAGE_ID)
    /// @param _expectedNotaryKeyFingerprint Expected notary key fingerprint from vlayer
    /// @param _expectedQueriesHash Expected hash of extraction queries
    /// @param _expectedUrlPattern Expected TikTok API URL pattern
    constructor(
        address _verifier,
        bytes32 _imageId,
        bytes32 _expectedNotaryKeyFingerprint,
        bytes32 _expectedQueriesHash,
        string memory _expectedUrlPattern
    ) {
        VERIFIER = IRiscZeroVerifier(_verifier);
        IMAGE_ID = _imageId;
        EXPECTED_NOTARY_KEY_FINGERPRINT = _expectedNotaryKeyFingerprint;
        EXPECTED_QUERIES_HASH = _expectedQueriesHash;
        expectedUrlPattern = _expectedUrlPattern;
    }

    /// @notice Submit and verify a TikTok campaign proof
    /// @param journalData Encoded proof data containing public outputs
    /// @param seal ZK proof seal for verification
    /// @dev Journal data should be abi.encoded as: (notaryKeyFingerprint, method, url, timestamp, queriesHash, campaignId, handleTiktok, scoreCalidad, urlVideo)
    function submitCampaign(
        bytes calldata journalData,
        bytes calldata seal
    ) external {
        // Decode the journal data
        (
            bytes32 notaryKeyFingerprint,
            string memory _method,
            string memory url,
            uint256 timestamp,
            bytes32 queriesHash,
            string memory campaignId,
            string memory handleTiktok,
            uint256 scoreCalidad,
            string memory urlVideo
        ) = abi.decode(journalData, (bytes32, string, string, uint256, bytes32, string, string, uint256, string));

        // Validate notary key fingerprint
        if (notaryKeyFingerprint != EXPECTED_NOTARY_KEY_FINGERPRINT) {
            revert InvalidNotaryKeyFingerprint();
        }

        // Validate queries hash
        if (queriesHash != EXPECTED_QUERIES_HASH) {
            revert InvalidQueriesHash();
        }

        // Validate URL equals the expected endpoint pattern provided at deployment
        if (keccak256(bytes(url)) != keccak256(bytes(expectedUrlPattern))) {
            revert InvalidUrl();
        }

        // Validate campaign ID is cmp_001
        if (keccak256(bytes(campaignId)) != keccak256(bytes(CAMPAIGN_ID))) {
            revert InvalidCampaignId();
        }

        // Validate score is a reasonable number (0-100)
        if (scoreCalidad == 0 || scoreCalidad > 100) {
            revert InvalidScore();
        }

        // Verify the ZK proof
        try VERIFIER.verify(seal, IMAGE_ID, sha256(journalData)) {
            // Proof verified successfully
        } catch {
            revert ZKProofVerificationFailed();
        }

        // Store the score for the handle
        scoresByHandle[handleTiktok] = scoreCalidad;

        emit CampaignVerified(
            handleTiktok,
            campaignId,
            scoreCalidad,
            urlVideo,
            timestamp,
            block.number
        );
    }

    /// @notice Get the score for a specific TikTok handle
    /// @param handleTiktok The TikTok handle to query
    /// @return The score for the handle (0 if not submitted)
    function getScore(string memory handleTiktok) external view returns (uint256) {
        return scoresByHandle[handleTiktok];
    }
}
