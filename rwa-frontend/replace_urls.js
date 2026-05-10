const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Wissen/RWA/rwa-frontend/src';

function walk(directory) {
    fs.readdirSync(directory).forEach(file => {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Replace "http://localhost:3001/..."
            if (content.match(/"http:\/\/localhost:3001([^"]*)"/)) {
                content = content.replace(/"http:\/\/localhost:3001([^"]*)"/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}$1`');
                modified = true;
            }

            // Replace 'http://localhost:3001/...'
            if (content.match(/'http:\/\/localhost:3001([^']*)'/)) {
                content = content.replace(/'http:\/\/localhost:3001([^']*)'/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}$1`');
                modified = true;
            }

            // Replace `http://localhost:3001/...`
            if (content.includes('`http://localhost:3001')) {
                content = content.replace(/`http:\/\/localhost:3001/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    });
}
walk(dir);
