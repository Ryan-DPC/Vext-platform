import fs from 'fs';
import path from 'path';

const pngPath = 'c:/Users/pa70iyc/Documents/Vext-platform/apps/frontend/src/assets/images/logo.png';
const svgPath = 'c:/Users/pa70iyc/Documents/Vext-platform/apps/frontend/src/assets/images/Logo.svg';

const base64 = fs.readFileSync(pngPath).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${base64}"/></svg>`;

fs.writeFileSync(svgPath, svg);
console.log('Successfully wrapped PNG into SVG');
