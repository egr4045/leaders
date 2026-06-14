const fs = require('fs');
const path = require('path');

module.exports = function(newNews) {
    const patchFile = path.join(__dirname, '../content/news_lines_patch.json');
    let patch = {};
    try {
        patch = JSON.parse(fs.readFileSync(patchFile, 'utf8'));
    } catch(e) {}
    
    for (const cardId in newNews) {
        if (!patch[cardId]) patch[cardId] = {};
        for (const choiceIdx in newNews[cardId]) {
            patch[cardId][choiceIdx] = newNews[cardId][choiceIdx];
        }
    }
    fs.writeFileSync(patchFile, JSON.stringify(patch, null, 2));
    console.log('Added ' + Object.keys(newNews).length + ' cards to patch.');
}
