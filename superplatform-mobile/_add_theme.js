const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllJsFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== 'contexts' && item.name !== 'navigation') {
      results = results.concat(getAllJsFiles(full));
    } else if (item.name.endsWith('.js')) results.push(full);
  }
  return results;
}

const files = getAllJsFiles(path.join(srcDir, 'screens')).concat(getAllJsFiles(path.join(srcDir, 'components')));
let updated = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('COLORS') || content.includes('useTheme')) continue;
  
  // Calculate relative path to contexts/ThemeContext from this file
  const rel = path.relative(path.dirname(file), path.join(srcDir, 'contexts')).replace(/\\/g, '/');
  const importPath = rel + '/ThemeContext';
  
  // Add useTheme import after any existing import line that has COLORS
  const lines = content.split('\n');
  let insertIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('COLORS') && lines[i].includes('import')) {
      insertIdx = i + 1;
      // Check if it's a multi-line import — find the closing }
      if (!lines[i].includes('}')) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('}')) { insertIdx = j + 1; break; }
        }
      }
      break;
    }
  }
  
  if (insertIdx === -1) continue;
  
  lines.splice(insertIdx, 0, `import { useTheme } from '${importPath}';`);
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  updated++;
  console.log(`Updated: ${path.relative(__dirname, file)}`);
}

console.log(`\nDone: ${updated} files updated with useTheme import`);
