const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('.next')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (dirFile.endsWith('.tsx') && !dirFile.endsWith('layout.tsx')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const mapReplacements = {
  'bg-[#111]': 'bg-[#F9FAFB]',
  'bg-[#000000]': 'bg-white',
  // and opacity classes
};

const files = walkSync('/Users/akashsmac/Documents/Attendance/frontend/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Apply inversion
  const regex = /\b(bg-black|bg-white|text-white|text-black|text-slate-900|text-slate-400|text-slate-50|bg-slate-50|bg-slate-900|bg-\[#111\]|bg-\[#000000\]|text-white\/(\d+)|text-black\/(\d+)|border-white\/(\d+)|border-black\/(\d+)|hover:bg-white\/(\d+)|hover:bg-black\/(\d+)|bg-white\/(\d+)|bg-black\/(\d+)|border-white|border-black)\b/g;

  content = content.replace(regex, (match) => {
    if (match === 'bg-black') return 'bg-white';
    if (match === 'bg-white') return 'bg-black';
    if (match === 'text-white') return 'text-black';
    if (match === 'text-black') return 'text-white';
    if (match === 'bg-[#111]') return 'bg-white';
    if (match === 'bg-[#000000]') return 'bg-white';
    if (match === 'border-white') return 'border-black';
    if (match === 'border-black') return 'border-white';
    if (match === 'text-slate-900') return 'text-black';
    if (match === 'text-slate-400') return 'text-black/60';
    if (match === 'text-slate-50') return 'text-black/80';
    if (match === 'bg-slate-50') return 'bg-[#f4f4f5]';
    if (match === 'bg-slate-900') return 'bg-black';
    
    if (match.startsWith('text-white/')) return match.replace('text-white/', 'text-black/');
    if (match.startsWith('text-black/')) return match.replace('text-black/', 'text-white/');
    if (match.startsWith('border-white/')) return match.replace('border-white/', 'border-black/');
    if (match.startsWith('border-black/')) return match.replace('border-black/', 'border-white/');
    if (match.startsWith('hover:bg-white/')) return match.replace('hover:bg-white/', 'hover:bg-black/');
    if (match.startsWith('hover:bg-black/')) return match.replace('hover:bg-black/', 'hover:bg-white/');
    if (match.startsWith('bg-white/')) return match.replace('bg-white/', 'bg-black/');
    if (match.startsWith('bg-black/')) return match.replace('bg-black/', 'bg-white/');

    return match;
  });
  
  // also fix some cards that had bg-black applied directly when inverted from bg-white
  // previously the script inverted bg-[#111111] to bg-[#F9FAFB] but wait, in page.tsx the cards are:
  // className="lg:col-span-3 card bg-white p-10 
  // they are already `card bg-white` because they were `card bg-black`.
  // Wait, if it's `card bg-white`, the text inside the card might be explicitly `text-black` or `text-slate-900`
  // let's look at page.tsx again
  content = content.replace(/bg-black/g, 'bg-white').replace(/bg-white text-white/g, 'bg-white text-black').replace(/text-black\/(\d+)/g, (match, p1) => `text-black/${p1}`).replace(/text-white/g, 'text-black');
  
  // Ensure the card backgrounds are correct and borders are black
  content = content.replace(/border-white(\/\d+)?/g, (match) => match.replace('white', 'black'));
  content = content.replace(/bg-white\/(\d+)/g, (match, p1) => `bg-black/${p1}`);
  content = content.replace(/bg-white text-white/g, 'bg-white text-black');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
});

