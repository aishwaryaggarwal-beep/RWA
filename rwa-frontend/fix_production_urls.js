const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Wissen/RWA/rwa-frontend/src';
const target = 'http://localhost:3001';
const replacement = 'https://rwa-pied.vercel.app';

function walk(directory) {
    fs.readdirSync(directory).forEach(file => {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(target)) {
                console.log(`Fixing: ${fullPath}`);
                const newContent = content.replace(new RegExp(target, 'g'), replacement);
                fs.writeFileSync(fullPath, newContent);
            }
        }
    });
}

walk(dir);
console.log('✅ Done! All hardcoded URLs have been pointed to production.');
