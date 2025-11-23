// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRiscZeroVerifier} from "risc0-ethereum/contracts/src/IRiscZeroVerifier.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title TikTokCampaignVerifierV2
/// @notice Multi-phase campaign system with registration, proof submission, and reward distribution
/// @dev Uses RISC Zero verifier to validate ZK proofs with two different proof types
contract TikTokCampaignVerifierV2 {
    /// @notice RISC Zero verifier contract
    IRiscZeroVerifier public immutable VERIFIER;

    /// @notice ZK proof program identifier
    bytes32 public immutable IMAGE_ID;

    /// @notice Expected notary key fingerprint from vlayer
    bytes32 public immutable EXPECTED_NOTARY_KEY_FINGERPRINT;

    /// @notice Expected queries hash for REGISTRATION proofs
    bytes32 public immutable REGISTRATION_QUERIES_HASH;

    /// @notice Expected queries hash for SUBMISSION proofs
    bytes32 public immutable SUBMISSION_QUERIES_HASH;

    /// @notice Expected URL for registration
    string public registrationUrlPattern;

    /// @notice Expected URL for submission
    string public submissionUrlPattern;

    /// @notice Fixed campaign ID
    string public constant CAMPAIGN_ID = "cmp_001";

    /// @notice CCOP token address (hardcoded)
    address public constant CCOP_ADDRESS = 0x8A567e2aE79CA692Bd748aB832081C45de4041eA;

    /// @notice CCOP token for rewards
    IERC20 public immutable CCOP;

    /// @notice Campaign states
    enum CampaignState {
        Registration,      // 0 - Users can register
        WaitingForProofs,  // 1 - Users can submit proofs
        Claimable          // 2 - Users can claim rewards
    }

    /// @notice Current campaign state
    CampaignState public currentState;

    /// @notice Registered influencers
    mapping(string => bool) public isRegistered;

    /// @notice Scores by handle (only for registered influencers)
    mapping(string => uint256) public scoresByHandle;

    /// @notice Whether an influencer has claimed their reward
    mapping(string => bool) public hasClaimed;

    /// @notice List of all registered handles (for reward distribution)
    string[] public registeredHandles;

    /// @notice Total score across all participants
    uint256 public totalScore;

    /// @notice Total number of registered influencers
    uint256 public totalRegistered;

    /// @notice Total number of influencers who submitted proofs
    uint256 public totalSubmitted;

    /// @notice Events
    event StateChanged(CampaignState indexed oldState, CampaignState indexed newState, uint256 timestamp);
    event InfluencerRegistered(string indexed handleTiktok, uint256 timestamp);
    event ProofSubmitted(string indexed handleTiktok, uint256 scoreCalidad, string urlVideo, uint256 timestamp);
    event RewardClaimed(string indexed handleTiktok, uint256 amount, uint256 timestamp);

    /// @notice Errors
    error InvalidNotaryKeyFingerprint();
    error InvalidQueriesHash();
    error InvalidUrl();
    error ZKProofVerificationFailed();
    error InvalidScore();
    error InvalidCampaignId();
    error InvalidState();
    error AlreadyRegistered();
    error NotRegistered();
    error AlreadySubmitted();
    error AlreadyClaimed();
    error NoRewardsAvailable();
    error InvalidHandle();

    /// @notice Constructor
    /// @param _verifier Address of the RISC Zero verifier contract
    /// @param _imageId ZK proof program identifier
    /// @param _expectedNotaryKeyFingerprint Expected notary key fingerprint from vlayer
    /// @param _registrationQueriesHash Expected hash for registration queries
    /// @param _submissionQueriesHash Expected hash for submission queries
    /// @param _registrationUrl Expected URL for registration
    /// @param _submissionUrl Expected URL for submission
    constructor(
        address _verifier,
        bytes32 _imageId,
        bytes32 _expectedNotaryKeyFingerprint,
        bytes32 _registrationQueriesHash,
        bytes32 _submissionQueriesHash,
        string memory _registrationUrl,
        string memory _submissionUrl
    ) {
        VERIFIER = IRiscZeroVerifier(_verifier);
        IMAGE_ID = _imageId;
        EXPECTED_NOTARY_KEY_FINGERPRINT = _expectedNotaryKeyFingerprint;
        REGISTRATION_QUERIES_HASH = _registrationQueriesHash;
        SUBMISSION_QUERIES_HASH = _submissionQueriesHash;
        registrationUrlPattern = _registrationUrl;
        submissionUrlPattern = _submissionUrl;
        CCOP = IERC20(CCOP_ADDRESS);
        currentState = CampaignState.Registration;
    }

    /// @notice Register an influencer for the campaign
    /// @param journalData Encoded proof data from registration API
    /// @param seal ZK proof seal
    /// @dev Journal format: (notaryKeyFingerprint, method, url, timestamp, queriesHash, campaignId, handleTiktok, proofSelf)
    function register(
        bytes calldata journalData,
        bytes calldata seal
    ) external {
        // Must be in Registration state
        if (currentState != CampaignState.Registration) {
            revert InvalidState();
        }

        // Decode the journal data including proofSelf
        (
            bytes32 notaryKeyFingerprint,
            string memory method,
            string memory url,
            uint256 timestamp,
            bytes32 queriesHash,
            string memory campaignId,
            string memory handleTiktok,
            bool proofSelf
        ) = abi.decode(journalData, (bytes32, string, string, uint256, bytes32, string, string, bool));

        // Validate notary key fingerprint
        if (notaryKeyFingerprint != EXPECTED_NOTARY_KEY_FINGERPRINT) {
            revert InvalidNotaryKeyFingerprint();
        }

        // Validate queries hash (REGISTRATION hash)
        if (queriesHash != REGISTRATION_QUERIES_HASH) {
            revert InvalidQueriesHash();
        }

        // Validate URL equals the registration endpoint
        if (keccak256(bytes(url)) != keccak256(bytes(registrationUrlPattern))) {
            revert InvalidUrl();
        }

        // Validate campaign ID
        if (keccak256(bytes(campaignId)) != keccak256(bytes(CAMPAIGN_ID))) {
            revert InvalidCampaignId();
        }

        // Validate proofSelf parameter - must be false
        if (!proofSelf) {
            revert InvalidState();
        }

        // Validate handle is not empty
        if (bytes(handleTiktok).length == 0) {
            revert InvalidHandle();
        }

        // Check if already registered
        if (isRegistered[handleTiktok]) {
            revert AlreadyRegistered();
        }

        // Verify the ZK proof
        try VERIFIER.verify(seal, IMAGE_ID, sha256(journalData)) {
            // Proof verified successfully
        } catch {
            revert ZKProofVerificationFailed();
        }

        // Register the influencer
        isRegistered[handleTiktok] = true;
        registeredHandles.push(handleTiktok);
        totalRegistered++;

        emit InfluencerRegistered(handleTiktok, timestamp);
    }

    /// @notice Submit proof of campaign participation
    /// @param journalData Encoded proof data from submission API
    /// @param seal ZK proof seal
    /// @dev Journal format: (notaryKeyFingerprint, method, url, timestamp, queriesHash, campaignId, handleTiktok, scoreCalidad, urlVideo)
    function submitVideo(
        bytes calldata journalData,
        bytes calldata seal
    ) external {
        // Must be in WaitingForProofs state
        if (currentState != CampaignState.WaitingForProofs) {
            revert InvalidState();
        }

        // Decode the journal data
        (
            bytes32 notaryKeyFingerprint,
            string memory method,
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

        // Validate queries hash (SUBMISSION hash)
        if (queriesHash != SUBMISSION_QUERIES_HASH) {
            revert InvalidQueriesHash();
        }

        // Validate URL equals the submission endpoint
        if (keccak256(bytes(url)) != keccak256(bytes(submissionUrlPattern))) {
            revert InvalidUrl();
        }

        // Validate campaign ID
        if (keccak256(bytes(campaignId)) != keccak256(bytes(CAMPAIGN_ID))) {
            revert InvalidCampaignId();
        }

        // Must be registered
        if (!isRegistered[handleTiktok]) {
            revert NotRegistered();
        }

        // Check if already submitted
        if (scoresByHandle[handleTiktok] > 0) {
            revert AlreadySubmitted();
        }

        // Validate score is a reasonable number (1-100)
        if (scoreCalidad == 0 || scoreCalidad > 100) {
            revert InvalidScore();
        }

        // Verify the ZK proof
        try VERIFIER.verify(seal, IMAGE_ID, sha256(journalData)) {
            // Proof verified successfully
        } catch {
            revert ZKProofVerificationFailed();
        }

        // Store the score
        scoresByHandle[handleTiktok] = scoreCalidad;
        totalScore += scoreCalidad;
        totalSubmitted++;

        emit ProofSubmitted(handleTiktok, scoreCalidad, urlVideo, timestamp);
    }

    /// @notice Claim rewards based on score
    /// @param handleTiktok The handle to claim for
    function claimReward(string memory handleTiktok) external {


        // deberia recibir la proof con mi handle

        // Must be in Claimable state
        if (currentState != CampaignState.Claimable) {
            revert InvalidState();
        }

        // Must be registered
        if (!isRegistered[handleTiktok]) {
            revert NotRegistered();
        }

        // Must have submitted proof
        uint256 score = scoresByHandle[handleTiktok];
        if (score == 0) {
            revert NotRegistered();
        }

        // Must not have claimed yet
        if (hasClaimed[handleTiktok]) {
            revert AlreadyClaimed();
        }

        // Calculate reward based on score tiers
        uint256 reward;
        if (score >= 50) {
            reward = 200 * 10**18; // 200 CCOP (assuming 18 decimals)
        } else if (score >= 20) {
            reward = 100 * 10**18; // 100 CCOP
        } else {
            revert InvalidScore(); // Score too low to claim
        }

        // Check contract has enough balance
        uint256 contractBalance = CCOP.balanceOf(address(this));
        if (contractBalance < reward) {
            revert NoRewardsAvailable();
        }

        // Mark as claimed
        hasClaimed[handleTiktok] = true;

        // Transfer reward
        require(CCOP.transfer(msg.sender, reward), "Transfer failed");

        emit RewardClaimed(handleTiktok, reward, block.timestamp);
    }

    /// @notice Advance to next state
    /// @dev Can be called by anyone to advance the campaign
    function advanceState() external {
        CampaignState oldState = currentState;

        if (currentState == CampaignState.Registration) {
            currentState = CampaignState.WaitingForProofs;
        } else if (currentState == CampaignState.WaitingForProofs) {
            currentState = CampaignState.Claimable;
        } else {
            revert InvalidState();
        }

        emit StateChanged(oldState, currentState, block.timestamp);
    }

    /// @notice Set campaign state to a specific value
    /// @param newState The state to set
    /// @dev Can be called by anyone to set the campaign state to any valid value
    function setState(CampaignState newState) external {
        CampaignState oldState = currentState;
        currentState = newState;
        emit StateChanged(oldState, currentState, block.timestamp);
    }

    /// @notice Get reward amount for a handle
    /// @param handleTiktok The handle to check
    /// @return The reward amount in CCOP
    function getRewardAmount(string memory handleTiktok) external view returns (uint256) {
        uint256 score = scoresByHandle[handleTiktok];
        if (score == 0) {
            return 0;
        }

        // Return reward based on score tiers
        if (score >= 50) {
            return 200 * 10**18; // 200 CCOP
        } else if (score >= 20) {
            return 100 * 10**18; // 100 CCOP
        } else {
            return 0; // Score too low
        }
    }

    /// @notice Get all registered handles
    /// @return Array of registered handles
    function getRegisteredHandles() external view returns (string[] memory) {
        return registeredHandles;
    }

    /// @notice Get campaign statistics
    /// @return registered Number of registered influencers
    /// @return submitted Number who submitted proofs
    /// @return totalScoreValue Total score across all submissions
    /// @return state Current campaign state
    function getCampaignStats() external view returns (
        uint256 registered,
        uint256 submitted,
        uint256 totalScoreValue,
        CampaignState state
    ) {
        return (totalRegistered, totalSubmitted, totalScore, currentState);
    }

    /// @notice Reset all campaign data to start fresh
    /// @dev Can be called by anyone to reset the campaign
    function resetCampaign() external {
        // Reset all handles
        for (uint256 i = 0; i < registeredHandles.length; i++) {
            string memory handle = registeredHandles[i];
            delete isRegistered[handle];
            delete scoresByHandle[handle];
            delete hasClaimed[handle];
        }

        // Clear the array
        delete registeredHandles;

        // Reset counters
        totalRegistered = 0;
        totalSubmitted = 0;
        totalScore = 0;

        // Reset to Registration state
        currentState = CampaignState.Registration;
    }

    /// @notice Reset a specific user's data
    /// @param handleTiktok The handle to reset
    function resetUser(string memory handleTiktok) external {
        if (!isRegistered[handleTiktok]) {
            revert NotRegistered();
        }

        // Get user's score to subtract from total
        uint256 userScore = scoresByHandle[handleTiktok];

        // Reset user data
        isRegistered[handleTiktok] = false;
        scoresByHandle[handleTiktok] = 0;
        hasClaimed[handleTiktok] = false;

        // Update totals
        if (userScore > 0) {
            totalScore -= userScore;
            totalSubmitted--;
        }
        totalRegistered--;

        // Remove from registered handles array
        for (uint256 i = 0; i < registeredHandles.length; i++) {
            if (keccak256(bytes(registeredHandles[i])) == keccak256(bytes(handleTiktok))) {
                // Move last element to this position and pop
                registeredHandles[i] = registeredHandles[registeredHandles.length - 1];
                registeredHandles.pop();
                break;
            }
        }
    }
}
