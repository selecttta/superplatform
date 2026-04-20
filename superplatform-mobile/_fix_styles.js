const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllJsFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && !['node_modules', 'contexts', 'navigation'].includes(item.name)) {
      results = results.concat(getAllJsFiles(full));
    } else if (item.name.endsWith('.js')) results.push(full);
  }
  return results;
}

const files = getAllJsFiles(path.join(srcDir, 'screens')).concat(getAllJsFiles(path.join(srcDir, 'components')));
let updated = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('useTheme')) continue;
  
  // Find the StyleSheet.create section and restore COLORS there
  // StyleSheet.create is always at module level (outside functions)
  const styleIdx = content.indexOf('StyleSheet.create(');
  if (styleIdx === -1) continue;
  
  // From styleIdx to end of file, replace colors. back to COLORS.
  const before = content.slice(0, styleIdx);
  let after = content.slice(styleIdx);
  after = after.replace(/\bcolors\./g, 'COLORS.');
  content = before + after;
  
  fs.writeFileSync(file, content, 'utf8');
  updated++;
  console.log(`Fixed: ${path.relative(__dirname, file)}`);
}

console.log(`\nDone: ${updated} files fixed (COLORS restored in StyleSheet.create)`);
