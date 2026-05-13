const fs = require('fs');
const path = require('path');

const API_LIVE_URL = "https://rwa-fu8n.vercel.app";
const OLD_URL_PATTERN = /https:\/\/rwa-pied\.vercel\.app/g;
const FALLBACK_PATTERN = /`\$\{process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*"https:\/\/rwa-pied\.vercel\.app"\}/g;
const FALLBACK_PATTERN_2 = /process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*"https:\/\/rwa-pied\.vercel\.app"/g;

const dir = 'c:/Users/Wissen/RWA/rwa-frontend/src';

function walk(directory) {
    fs.readdirSync(directory).forEach(file => {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;

            // 1. Replace hardcoded old URLs
            content = content.replace(OLD_URL_PATTERN, API_LIVE_URL);

            // 2. Replace the complex process.env fallback templates
            content = content.replace(FALLBACK_PATTERN, '`${API_URL}');
            content = content.replace(FALLBACK_PATTERN_2, 'API_URL');

            // 3. Ensure API_URL is imported if we used it
            if (content.includes('API_URL') && !content.includes('import { API_URL }')) {
                // Find first import and insert after it
                const lines = content.split('\n');
                let insertIdx = 0;
                for(let i=0; i<lines.length; i++) {
                    if (lines[i].startsWith('import')) insertIdx = i + 1;
                }
                
                // Determine relative path for import
                const depth = fullPath.replace(dir, '').split(path.sep).length - 1;
                const relPath = depth === 0 ? './lib/api' : '../'.repeat(depth - 1) + 'lib/api';
                // Simplified: use alias if possible, but let's stick to relative
                // Or just use the @ alias which is standard in this project
                lines.splice(insertIdx, 0, 'import { API_URL } from "@/src/lib/api";');
                content = lines.join('\n');
            }

            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log(`✅ Fixed: ${fullPath.replace('c:/Users/Wissen/RWA/rwa-frontend/', '')}`);
            }
        }
    });
}

console.log("🚀 Starting Nuclear URL Cleanup...");
walk(dir);
console.log("✨ Cleanup Complete!");
