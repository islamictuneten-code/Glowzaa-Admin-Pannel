import fs from 'fs';
const file = 'src/components/admin/procurement/PurchaseOrdersDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import { getPurchaseRequests, getPurchaseRequestItems, getSuppliers } from '../../../services/firestoreService';",
  `import { getPurchaseRequests, getPurchaseRequestItems, getSuppliers } from '../../../services/firestoreService';\nimport { GoodsReceiptForm } from './GoodsReceiptForm';`
);

code = code.replace(
  "const [actionLoading, setActionLoading] = useState(false);",
  "const [actionLoading, setActionLoading] = useState(false);\n  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);"
);

code = code.replace(
  "    </div>\n  );\n};",
  `      {receivingOrder && (\n        <GoodsReceiptForm \n          purchaseOrder={receivingOrder}\n          onClose={() => setReceivingOrder(null)}\n          onSuccess={() => {\n            setReceivingOrder(null);\n            fetchData();\n          }}\n        />\n      )}\n    </div>\n  );\n};`
);

fs.writeFileSync(file, code);
