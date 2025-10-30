const fs = require('fs');
const path = require('path');
const inputFilePath = path.join(__dirname, 'traders_index.json');
const outputFilePath = path.join(__dirname, 'traders_output.json');

try {
    const rawData = fs.readFileSync(inputFilePath, 'utf8');
    const tapersObject = JSON.parse(rawData);
    const tapersArray = Object.entries(tapersObject).map(([name, shows]) => {
        return {
            name: name,
            website: "",
            shows: shows
        };
    });
    const outputData = JSON.stringify(tapersArray, null, 4);
    fs.writeFileSync(outputFilePath, outputData, 'utf8');
    console.log(`Successfully transformed data and saved to ${outputFilePath}`);
} catch (err) {
    console.error('An error occurred:', err.message);
}