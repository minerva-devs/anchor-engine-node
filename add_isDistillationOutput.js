"const fs = require('fs');"  
"const content = \`\\n/**\* Check if a filename is from a distillation output directory* Standard 135: Prevent self-contamination by checking directory paths\*/\\nexport function isDistillationOutput(filename: string): boolean {\\n  const distillationExtensions = ['.yaml', '.yml', '.json', '.md'];\\n  if (!distillationExtensions.some(ext => filename.endsWith(ext))) return false;\\n  const inDistillsDir = filename.startsWith('distilled_');\\n  return inDistillsDir;\\n}\\`;;"  
"const original = fs.readFileSync('engine/src/services/distillation/radial-distiller.ts', 'utf8');"  
"fs.writeFileSync('engine/src/services/distillation/radial-distiller.ts', original + content);"  
