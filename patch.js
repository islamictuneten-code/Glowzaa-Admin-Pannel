const fs = require('fs');
const file = 'src/services/grnService.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `
      // Process items
      for (const grnItem of grnItems) {
        if (grnItem.acceptedQuantity > 0) {
`;
const replacement = `
      // Process items
      for (const grnItem of grnItems) {
        if (true) {
`;
code = code.replace(target, replacement);

const target2 = `
          // Update Product Stock
          transaction.update(productRef, {
            stock: newStock,
            updatedAt: now
          });

          // Create InventoryTransaction
          const invTransId = doc(collection(db, 'inventory_transactions')).id;
          const invTrans: InventoryTransaction = {
            id: invTransId,
            productId: product.id,
            productName: product.name,
            sku: product.sku || '',
            previousStock,
            adjustmentQuantity: grnItem.acceptedQuantity,
            newStock,
            type: 'stock_in',
            reason: \`Goods Receipt \${grn.grnNumber}\`,
            userId: currentUser.uid || currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            createdAt: now,
            
            unitCost: grnItem.unitPurchasePriceBDT,
            totalCost: grnItem.acceptedValueBDT,
            purchaseOrderId: po.id,
            purchaseOrderItemId: poItem.id,
            goodsReceiptId: grn.id,
            grnNumber: grn.grnNumber,
            supplierId: po.supplierId,
            supplierName: po.supplierName
          };
          transaction.set(doc(db, 'inventory_transactions', invTransId), cleanUndefined(invTrans));
`;
const replacement2 = `
          if (grnItem.acceptedQuantity > 0) {
            // Update Product Stock
            transaction.update(productRef, {
              stock: newStock,
              updatedAt: now
            });

            // Create InventoryTransaction
            const invTransId = doc(collection(db, 'inventory_transactions')).id;
            const invTrans: InventoryTransaction = {
              id: invTransId,
              productId: product.id,
              productName: product.name,
              sku: product.sku || '',
              previousStock,
              adjustmentQuantity: grnItem.acceptedQuantity,
              newStock,
              type: 'stock_in',
              reason: \`Goods Receipt \${grn.grnNumber}\`,
              userId: currentUser.uid || currentUser.id,
              userName: currentUser.name,
              userRole: currentUser.role,
              createdAt: now,
              
              unitCost: grnItem.unitPurchasePriceBDT,
              totalCost: grnItem.acceptedValueBDT,
              purchaseOrderId: po.id,
              purchaseOrderItemId: poItem.id,
              goodsReceiptId: grn.id,
              grnNumber: grn.grnNumber,
              supplierId: po.supplierId,
              supplierName: po.supplierName
            };
            transaction.set(doc(db, 'inventory_transactions', invTransId), cleanUndefined(invTrans));
          }
`;
code = code.replace(target2, replacement2);
fs.writeFileSync(file, code);
