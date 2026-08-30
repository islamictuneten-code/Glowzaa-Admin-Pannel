import fs from 'fs';
const file = 'src/services/grnService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import { recordProcurementAuditLog } from './purchaseOrderService';",
  "import { recordProcurementAuditLog } from './firestoreService';"
);

fs.writeFileSync(file, code);
