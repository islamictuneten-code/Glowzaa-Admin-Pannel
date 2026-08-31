import { Order, DeliveryStaff, AuthUser } from '../types';

/**
 * Robust helper to check if an order is assigned to a specific delivery staff user.
 * Matches by any of:
 * - deliveryStaffId vs deliveryUser.id / uid / staffId / email / currentUser.uid / currentUser.staffId / currentUser.email
 * - deliveryStaffName vs deliveryUser.name / currentUser.name
 */
export function isOrderAssignedToDeliveryUser(
  order: Order | null | undefined,
  deliveryUser?: DeliveryStaff | null,
  currentUser?: AuthUser | null
): boolean {
  if (!order) return false;

  const candidateIds = new Set<string>();

  if (deliveryUser?.id) candidateIds.add(String(deliveryUser.id).toLowerCase().trim());
  if ((deliveryUser as any)?.uid) candidateIds.add(String((deliveryUser as any).uid).toLowerCase().trim());
  if ((deliveryUser as any)?.staffId) candidateIds.add(String((deliveryUser as any).staffId).toLowerCase().trim());
  if (deliveryUser?.email) candidateIds.add(String(deliveryUser.email).toLowerCase().trim());

  if (currentUser?.uid) candidateIds.add(String(currentUser.uid).toLowerCase().trim());
  if ((currentUser as any)?.id) candidateIds.add(String((currentUser as any).id).toLowerCase().trim());
  if (currentUser?.staffId) candidateIds.add(String(currentUser.staffId).toLowerCase().trim());
  if (currentUser?.email) candidateIds.add(String(currentUser.email).toLowerCase().trim());

  // Fallback: if no delivery staff or auth user is loaded yet, but default demo delivery user 'deliv-01' is active
  if (candidateIds.size === 0) {
    candidateIds.add('deliv-01');
  }

  const candidateNames = new Set<string>();
  if (deliveryUser?.name) candidateNames.add(deliveryUser.name.toLowerCase().trim());
  if (currentUser?.name) candidateNames.add(currentUser.name.toLowerCase().trim());

  // 1. Check order.deliveryStaffId
  if (order.deliveryStaffId) {
    const orderStaffId = String(order.deliveryStaffId).toLowerCase().trim();
    if (orderStaffId && candidateIds.has(orderStaffId)) {
      return true;
    }
  }

  // 2. Check order.deliveryStaffName
  if (order.deliveryStaffName) {
    const orderStaffName = String(order.deliveryStaffName).toLowerCase().trim();
    if (
      orderStaffName &&
      Array.from(candidateNames).some(
        name => name === orderStaffName || name.includes(orderStaffName) || orderStaffName.includes(name)
      )
    ) {
      return true;
    }
  }

  return false;
}
