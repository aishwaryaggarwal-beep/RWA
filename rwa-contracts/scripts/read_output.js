const fs = require('fs');
const content = fs.readFileSync('deployment_output.txt', 'utf16le');
console.log(content);
