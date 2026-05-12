const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Wissen/RWA/rwa-frontend/src';
const targets = ['http://localhost:3001', 'http://127.0.0.1:3001'];
const replacement = 'https://rwa-pied.vercel.app';

function walk(directory) {
    fs.readdirSync(directory).forEach(file => {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            targets.forEach(target => {
                if (content.includes(target)) {
                    console.log(`Fixing target [${target}] in: ${fullPath}`);
                    content = content.replace(new RegExp(target, 'g'), replacement);
                    modified = true;
                }
            });

            if (modified) {
                fs.writeFileSync(fullPath, content);
            }
        }
    });
}

walk(dir);
console.log('✅ Final cleanup done! No more local links exist.');
