const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../features/library/library.service.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all occurrences of "Ownership." that are NOT preceded by "const " or "GameOwnership"
// This regex matches "Ownership." but not "const Ownership" or "GameOwnership"
content = content.replace(/(?<!const\s)(?<!Game)Ownership\b/g, 'GameOwnership');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Replaced all Ownership occurrences with GameOwnership');
