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
  
  // Find the main function component and add `const { colors } = useTheme();` at the top
  // Look for "export default function XXX(" or "function XXX(" at the start of a line
  const funcRe = /^(export\s+default\s+)?function\s+\w+\s*\([^)]*\)\s*\{/gm;
  let match;
  let firstFuncInserted = false;
  
  while ((match = funcRe.exec(content)) !== null) {
    if (firstFuncInserted) break; // Only insert in the first/main function
    const insertPos = match.index + match[0].length;
    
    // Check if `colors` is already destructured near this position
    const nextChunk = content.slice(insertPos, insertPos + 200);
    if (nextChunk.includes('useTheme()')) continue;
    
    content = content.slice(0, insertPos) + '\n  const { colors } = useTheme();' + content.slice(insertPos);
    firstFuncInserted = true;
  }
  
  if (!firstFuncInserted) continue;
  
  // Replace COLORS. with colors. in style references (but NOT in the import line or StyleSheet.create)
  // We do this carefully — only replace COLORS references that are used in JSX/logic, not in static styles
  // Actually, let's replace ALL COLORS. with colors. since the static styles will be overridden
  content = content.replace(/\bCOLORS\./g, 'colors.');
  
  // But restore the import line — don't break: import { COLORS } → import { colors }
  // Actually COLORS in imports is within braces and followed by space/comma, not a dot
  // So the regex above (COLORS.) won't match the import. Safe!
  
  fs.writeFileSync(file, content, 'utf8');
  updated++;
  console.log(`Updated: ${path.relative(__dirname, file)}`);
}

console.log(`\nDone: ${updated} files with colors = useTheme() + COLORS.→colors.`);
