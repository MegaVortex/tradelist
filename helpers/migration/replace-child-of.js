const fs = require('fs');
const path = require('path');
const regularDir = path.join(__dirname, 'data');
const vaDir = path.join(__dirname, 'data-comp');
const fixedUnix = Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000);
const vaMap = {};
fs.readdirSync(vaDir).forEach(file => {
    if (!file.endsWith('.json')) return;
    const fullPath = path.join(vaDir, file);
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    if (content.originalTitle) {
        const slug = file.replace(/\.json$/, '');
        vaMap[content.originalTitle] = slug;
    }
});
const regularFiles = fs.readdirSync(regularDir).filter(f => f.endsWith('.json'));

regularFiles.forEach((file, i) => {
    const fullPath = path.join(regularDir, file);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    process.stdout.write(`(${i + 1}/${regularFiles.length}) ${file} ... `);

    if (typeof data.childOf === 'string') {
        const key = data.childOf;
        const keyWithCompilation = `${key} [Compilation]`;

        let matchedSlug = null;

        if (vaMap[key]) {
            matchedSlug = vaMap[key];
        } else if (vaMap[keyWithCompilation]) {
            matchedSlug = vaMap[keyWithCompilation];
        }

        if (matchedSlug) {
            data.childOf = matchedSlug;
            data.created = fixedUnix;
            fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
            console.log(`✔ updated`);
        } else {
            console.log(`— skipped`);
        }
    } else {
        console.log(`— skipped`);
    }
});