import fs from 'fs';
const file = 'src/services/grnService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import { \n  Product, \n  User, \n  PurchaseOrder, ",
  "import { \n  Product, \n  AuthUser, \n  PurchaseOrder, "
);

code = code.replace(/currentUser: User/g, "currentUser: AuthUser");

code = code.replace(/product\.stock/g, "product.currentStock");

fs.writeFileSync(file, code);
