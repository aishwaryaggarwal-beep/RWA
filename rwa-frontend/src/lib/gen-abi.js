const fs = require('fs');
const mkAbi = (path) => JSON.parse(fs.readFileSync('C:/Users/Wissen/RWA/rwa-contracts/artifacts/contracts/' + path)).abi;

const rwaMarketplace = mkAbi('RWAMarketplace.sol/RWAMarketplace.json');
const rwaToken = mkAbi('RWAToken.sol/RWAToken.json');
const landToken = mkAbi('LandToken.sol/LandToken.json');

const content = `
export const RWAMarketplaceABI = ${JSON.stringify(rwaMarketplace, null, 2)};
export const RWATokenABI = ${JSON.stringify(rwaToken, null, 2)};
export const LandTokenABI = ${JSON.stringify(landToken, null, 2)};

export const ADDRESSES = {
  RWAMarketplace: '0x_PLACEHOLDER_MARKETPLACE',
  RWAToken: '0x_PLACEHOLDER_RWATOKEN',
  LandToken: '0x_PLACEHOLDER_LANDTOKEN'
};
`;

fs.mkdirSync('C:/Users/Wissen/RWA/rwa-frontend/src/lib/contracts', { recursive: true });
fs.writeFileSync('C:/Users/Wissen/RWA/rwa-frontend/src/lib/contracts/abi.ts', content);
console.log('Successfully generated abi.ts!');
