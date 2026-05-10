const fs = require('fs');
try {
    const data = fs.readFileSync('deployment_output_rwaswap.txt', 'utf16le');
    ['LandToken:', 'RWAToken:', 'LandVerifier:', 'RWAMarketplace:', 'RWASwap:'].forEach(label => {
        const index = data.indexOf(label);
        if (index !== -1) {
            const line = data.substring(index, data.indexOf('\n', index)).trim();
            console.log('CONTRACT_ADDR_' + label.replace(':', '') + ' ' + line.split(/\s+/).pop());
        }
    });
} catch (err) {
    console.error(err);
}
