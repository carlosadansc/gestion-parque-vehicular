const fs = require('fs');
const path = require('path');

const componentsDir = './components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

const replacements = {
  'bg-white': 'bg-surface',
  'text-slate-900': 'text-text',
  'text-slate-400': 'text-text-muted',
  'text-slate-500': 'text-text-muted',
  'text-slate-600': 'text-text-muted',
  'text-slate-700': 'text-text',
  'bg-slate-50': 'bg-surface-subtle',
  'bg-slate-100': 'bg-surface-subtle',
  'bg-slate-900': 'bg-secondary',
  'border-slate-200': 'border-border',
  'border-slate-100': 'border-border'
};

files.forEach(file => {
  const filepath = path.join(componentsDir, file);
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;

  for (const [key, val] of Object.entries(replacements)) {
    const rx = new RegExp(`\\b${key}\\b`, 'g');
    if(rx.test(content)){
      content = content.replace(rx, val);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filepath, content);
    console.log('Replaced colors in', file);
  }
});
