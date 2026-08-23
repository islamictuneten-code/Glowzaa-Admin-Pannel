const fs = require('fs');
let code = fs.readFileSync('src/services/staffAuthService.ts', 'utf8');
code = code.replace(/await addDoc,\n  onSnapshot/g, 'await addDoc');
fs.writeFileSync('src/services/staffAuthService.ts', code);
