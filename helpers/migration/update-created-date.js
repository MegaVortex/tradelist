const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'output_simple', 'shows');
const fixedUnix = Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000);

function walkAndUpdate(dir) {
    fs.readdirSync(dir).forEach(entry => {
        const fullPath = path.join(dir, entry);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            walkAndUpdate(fullPath);
        } else if (entry.endsWith('.json')) {
            try {
                const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                data.created = fixedUnix;
                fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
                console.log(`✅ updated created: ${fullPath}`);
            } catch (err) {
                console.warn(`⚠️ skipped: ${fullPath} (error: ${err.message})`);
            }
        }
    });
}

walkAndUpdate(targetDir);