const fs = require('fs');

let code = fs.readFileSync('src/services/staffAuthService.ts', 'utf8');

code = code.replace(
  /await addDoc\(collection\(db, 'audit_logs'\),/g,
  `addDoc(collection(db, 'audit_logs'),`
);

fs.writeFileSync('src/services/staffAuthService.ts', code);
