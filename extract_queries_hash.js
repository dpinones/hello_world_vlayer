const fs = require('fs');
const { decodeAbiParameters } = require('viem');

// Read the compress response
const compressResponse = JSON.parse(fs.readFileSync('/tmp/compress_response.json', 'utf-8'));
const journalDataAbi = compressResponse.data.journalDataAbi;

console.log('=== Decoding Journal Data ===\n');

// Define the ABI structure for TikTok campaign
const journalAbi = [
  { type: 'bytes32', name: 'notaryKeyFingerprint' },
  { type: 'string', name: 'method' },
  { type: 'string', name: 'url' },
  { type: 'uint256', name: 'timestamp' },
  { type: 'bytes32', name: 'queriesHash' },
  { type: 'string', name: 'campaignId' },
  { type: 'string', name: 'handleTiktok' },
  { type: 'uint256', name: 'scoreCalidad' },
  { type: 'string', name: 'urlVideo' }
];

try {
  const decoded = decodeAbiParameters(journalAbi, journalDataAbi);

  console.log('Decoded fields:');
  console.log('----------------------------------------');
  console.log(`notaryKeyFingerprint: ${decoded[0]}`);
  console.log(`method: ${decoded[1]}`);
  console.log(`url: ${decoded[2]}`);
  console.log(`timestamp: ${decoded[3]}`);
  console.log(`queriesHash: ${decoded[4]}`);
  console.log(`campaignId: ${decoded[5]}`);
  console.log(`handleTiktok: ${decoded[6]}`);
  console.log(`scoreCalidad: ${decoded[7]}`);
  console.log(`urlVideo: ${decoded[8]}`);
  console.log('----------------------------------------\n');

  console.log('✓ QUERIES_HASH found:', decoded[4]);
  console.log('\nUpdate your .env file with:');
  console.log(`QUERIES_HASH=${decoded[4]}`);

} catch (error) {
  console.error('Error decoding:', error.message);
  process.exit(1);
}
