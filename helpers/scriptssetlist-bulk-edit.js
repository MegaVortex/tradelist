const fs = require('fs');
const path = require('path');
const readline = require('readline');
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const SETLIST_STRING_FIELDS = ['song', 'feat', 'note', 'comment', 'coverOf'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question, options = {}) {
  const { trim = true } = options;
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(trim ? answer.trim() : answer);
    });
  });
}

async function main() {
  console.log('=== Bulk Setlist Editor ===\n');
  console.log(`Data folder: ${DATA_DIR}\n`);
  console.log(
    `Available setlist fields: ${SETLIST_STRING_FIELDS.join(', ')}\n`
  );
  let sourceField = '';
  while (!SETLIST_STRING_FIELDS.includes(sourceField)) {
    sourceField = await ask(
      `1) Field to SEARCH in each setlist entry (${SETLIST_STRING_FIELDS.join(
        ', '
      )}): `
    );
  }

  console.log('\nSearch mode:');
  console.log('  [1] equals (exact match)');
  console.log('  [2] contains substring (recommended)\n');

  let searchMode = '';
  while (!['1', '2'].includes(searchMode)) {
    searchMode = await ask('2) Choose search mode [1/2]: ');
  }

  const searchText = await ask(
    '\n3) Text to search for (case sensitive, e.g. " (PA)"): ',
    { trim: false }
  );

  if (!searchText) {
    console.log('No search text provided. Aborting.');
    rl.close();
    return;
  }

  console.log('\nOperation to perform on matched entries:');
  console.log('  [1] Clear field (set it to empty string)');
  console.log('  [2] Replace whole value of this field');
  console.log(
    '  [3] Remove only the matching part from this field (keep the rest)'
  );
  console.log(
    '  [4] Remove matching part from this field AND update another field'
  );
  console.log('');

  let op = '';
  while (!['1', '2', '3', '4'].includes(op)) {
    op = await ask('4) Choose operation [1/2/3/4]: ');
  }

  let replaceWhole = '';
  let removeReplacement = '';
  let destField = '';
  let destText = '';
  let appendMode = false;

  if (op === '2') {
    replaceWhole = await ask(
      '\nReplacement text for the WHOLE field value: '
    );
  }

  if (op === '3' || op === '4') {
    removeReplacement = await ask(
      '\nReplacement for the removed part (leave empty to just delete it): ',
      { trim: false }
    );
  }

  if (op === '4') {
    console.log(
      `\nDestination fields available: ${SETLIST_STRING_FIELDS.join(', ')}`
    );
    while (!SETLIST_STRING_FIELDS.includes(destField)) {
      destField = await ask(
        `Destination field to UPDATE (${SETLIST_STRING_FIELDS.join(', ')}): `
      );
    }

    destText = await ask(
      'Text to put into destination field (e.g. "tape"): '
    );

    const appendAnswer = (
      await ask(
        'If destination already has text, append instead of overwrite? [y/N]: '
      )
    ).toLowerCase();

    appendMode = appendAnswer === 'y' || appendAnswer === 'yes';
  }

  console.log('\n=== Summary of your choices ===');
  console.log(`Source field:          ${sourceField}`);
  console.log(
    `Search mode:           ${
      searchMode === '1' ? 'equals (exact)' : 'contains substring'
    }`
  );
  console.log(`Search text:           "${searchText}"`);
  console.log(
    `Operation:             ${
      op === '1'
        ? 'Clear field'
        : op === '2'
        ? 'Replace whole value'
        : op === '3'
        ? 'Remove matching part'
        : 'Remove matching part + update another field'
    }`
  );

  if (op === '2') {
    console.log(`New full value:        "${replaceWhole}"`);
  }
  if (op === '3' || op === '4') {
    console.log(
      `Replace matching part with: "${removeReplacement}" (empty = delete)`
    );
  }
  if (op === '4') {
    console.log(`Destination field:     ${destField}`);
    console.log(`Destination text:      "${destText}"`);
    console.log(
      `Destination append:    ${appendMode ? 'append if not empty' : 'overwrite'}`
    );
  }

  const confirm = (
    await ask(
      `\nProceed with these changes across ALL JSON files in ${DATA_DIR}? [y/N]: `
    )
  ).toLowerCase();

  if (confirm !== 'y' && confirm !== 'yes') {
    console.log('Aborted by user.');
    rl.close();
    return;
  }

  console.log('\nProcessing files...\n');

  let files;
  try {
    files = await fs.promises.readdir(DATA_DIR);
  } catch (err) {
    console.error('Error reading data directory:', err.message);
    rl.close();
    return;
  }

  const jsonFiles = files.filter((f) => f.toLowerCase().endsWith('.json'));

  let totalFilesWithSetlist = 0;
  let changedFiles = 0;
  let totalMatches = 0;

  for (const file of jsonFiles) {
    const fullPath = path.join(DATA_DIR, file);
    let raw;
    try {
      raw = await fs.promises.readFile(fullPath, 'utf8');
    } catch (err) {
      console.error(`Error reading file ${file}:`, err.message);
      continue;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`Skipping invalid JSON file ${file}:`, err.message);
      continue;
    }

    if (!Array.isArray(data.setlist)) {
      continue;
    }

    totalFilesWithSetlist++;
    let fileChanged = false;

    for (const item of data.setlist) {
      if (!item || typeof item[sourceField] !== 'string') continue;

      const currentValue = item[sourceField];
      if (currentValue == null) continue;

      let isMatch = false;
      if (searchMode === '1') {
        isMatch = currentValue === searchText;
      } else {
        isMatch = currentValue.includes(searchText);
      }

      if (!isMatch) continue;

      totalMatches++;
      fileChanged = true;

      if (op === '1') {
        item[sourceField] = '';
      } else if (op === '2') {
        item[sourceField] = replaceWhole;
      } else if (op === '3' || op === '4') {
        const newValue = currentValue.split(searchText).join(removeReplacement);
        item[sourceField] = newValue;

        if (op === '4') {
          const currentDest =
            typeof item[destField] === 'string' ? item[destField] : '';

          if (!currentDest) {
            item[destField] = destText;
          } else if (appendMode) {
            item[destField] = currentDest + ' ' + destText;
          } else {
            item[destField] = destText;
          }
        }
      }
    }

    if (fileChanged) {
      try {
        data.lastUpdated = Math.floor(Date.now() / 1000);
    
      await fs.promises.writeFile(
        fullPath,
        JSON.stringify(data, null, 2),
        'utf8'
      );
        changedFiles++;
      } catch (err) {
        console.error(`Error writing file ${file}:`, err.message);
      }
    }
  }

  console.log('\n=== Done ===');
  console.log(`Total JSON files scanned:      ${jsonFiles.length}`);
  console.log(
    `Files with setlist:            ${totalFilesWithSetlist}`
  );
  console.log(`Files changed:                 ${changedFiles}`);
  console.log(`Total matching setlist items:  ${totalMatches}`);

  rl.close();
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  rl.close();
  process.exit(1);
});