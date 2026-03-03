const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.tsx') && !dirFile.endsWith('layout.tsx')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync('/Users/akashsmac/Documents/Attendance/frontend/src/app/dashboard');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Apply inversion
  const regex = /\b(bg-black|bg-white|text-white|text-black|bg-\[#111111\]|bg-\[#1A1A1A\]|text-white\/(\d+)|text-black\/(\d+)|border-white\/(\d+)|border-black\/(\d+)|hover:bg-white\/(\d+)|hover:bg-black\/(\d+)|bg-white\/(\d+)|bg-black\/(\d+)|border-white|border-black)\b/g;

  content = content.replace(regex, (match) => {
    if (match === 'bg-black') return 'bg-white';
    if (match === 'bg-white') return 'bg-black';
    if (match === 'text-white') return 'text-black';
    if (match === 'text-black') return 'text-white';
    if (match === 'bg-[#111111]') return 'bg-[#F9FAFB]';
    if (match === 'bg-[#1A1A1A]') return 'bg-[#E5E7EB]';
    if (match === 'border-white') return 'border-black';
    if (match === 'border-black') return 'border-white';
    
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

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
});
