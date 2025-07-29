const fs = require('fs');
const path = require('path');

// Path to compilation shows folder
const compDir = path.join('C:', 'Users', 'ovech', 'Documents', 'new_trade_list', 'tl_web', 'src', 'data-comp');

// Read all JSON files in the compilation directory
const files = fs.readdirSync(compDir).filter(f => f.endsWith('.json'));

let updatedCount = 0;

files.forEach((file, i) => {
    const fullPath = path.join(compDir, file);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    if (Array.isArray(data.parentOf) && data.parentOf.length > 0) {
        let changed = false;

        data.parentOf = data.parentOf.map(item => {
            if (item.includes('misc_video_misc')) {
                changed = true;
                return item.replace('misc_video_misc', 'video_misc');
            }
            return item;
        });

        if (changed) {
            fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
            updatedCount++;
            console.log(`✔ Updated ${file}`);
        } else {
            console.log(`— No changes in ${file}`);
        }
    } else {
        console.log(`— Skipped ${file} (no parentOf)`);
    }
});

console.log(`\n✅ Done! Updated ${updatedCount} files.`);