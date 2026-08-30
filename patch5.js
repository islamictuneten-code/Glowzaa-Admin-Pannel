import fs from 'fs';
const file = 'src/services/grnService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import {\n  Product,\n  User,",
  "import {\n  Product,\n  AuthUser as User,"
);

fs.writeFileSync(file, code);
