/**
 * GLOWZAA B2B WHOLESALE COMMERCE
 * Phase 3: Automatic Shop Visit Detection & Geofence Engine
 * 
 * Business Rules & Specification:
 * 1. REMOVE MANUAL SHOP VISIT ACTIONS FROM SALES STAFF.
 * 2. ENTRY_RADIUS = 100 meters (geofence entry trigger).
 * 3. EXIT_RADIUS = 150 meters (geofence exit trigger with hysteresis to prevent GPS jitter flapping).
 * 4. MIN_VISIT_DWELL_MS = 3 minutes (180,000 ms) minimum dwell time required to record/confirm a shop visit.
 * 5. GPS Accuracy Filtering: Accuracy > 80m rejected from triggering visits to avoid false positives.
 * 6. Repeat Visits: A seller can visit the same shop multiple times in a day. Each dwell >= 3 min creates a distinct visit event.
 * 7. Auto-Linking: Automatically associates booked retail orders or collected payments during the visit window with the visit record.
 */

import { doc, getDoc, getDocs, collection, query, where, orderBy, limit, updateDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Customer, CustomerVisit, CustomerVisitOutcome, FieldDutySession, AuthUser } from '../types';
import { calculateDistanceMeters, validateLocationAccuracy } from './locationService';
import { cleanUndefined } from './firestoreService';

// Geofence & Detection Constants
export const ENTRY_RADIUS_METERS = 100;
export const EXIT_RADIUS_METERS = 150;
export const MIN_VISIT_DWELL_MS = 3 * 60 * 1000; // 3 minutes
export const MAX_ACCEPTABLE_ACCURACY_METERS = 80;

export interface DwellCandidateState {
  customerId: string;
  shopName: string;
  ownerName: string;
  enteredAtMs: number;
  lastPingMs: number;
  lastDistanceMeters: number;
  lastLatitude: number;
  lastLongitude: number;
  lastAccuracyMeters: number;
  visitDocId: string | null;
  isConfirmed: boolean; // True once dwell >= 3 minutes and Firestore doc is created
}

// In-memory candidate dwell tracker per sales user (persists across watch callbacks)
const activeDwellByUser = new Map<string, DwellCandidateState>();

/**
 * Returns the current candidate dwell state for a user.
 */
export function getCurrentDwellState(userId: string): DwellCandidateState | null {
  return activeDwellByUser.get(userId) || null;
}

/**
 * Clears the dwell candidate state for a user (e.g. on logout or manual reset).
 */
export function clearDwellState(userId: string): void {
  activeDwellByUser.delete(userId);
}

/**
 * Core Geofence State Machine:
 * Processes a single GPS position against all known customer shops with GPS coordinates.
 * Evaluates entry, dwell time, active visit creation, and exit completion with hysteresis.
 */
export async function processLocationForAutomaticVisits(params: {
  currentUser: AuthUser;
  activeSession: FieldDutySession;
  currentLat: number;
  currentLon: number;
  accuracy: number;
  allCustomers: Customer[];
  onVisitCreated?: (visit: CustomerVisit) => void;
  onVisitCompleted?: (visitId: string, durationMinutes: number) => void;
}): Promise<{
  actionTaken: 'none' | 'dwell_started' | 'visit_confirmed' | 'visit_exited' | 'in_progress';
  currentShopName?: string;
  distanceMeters?: number;
  dwellMinutes?: number;
  visitId?: string;
}> {
  const { currentUser, activeSession, currentLat, currentLon, accuracy, allCustomers } = params;

  if (!currentUser?.uid || !activeSession?.id || activeSession.status !== 'active') {
    return { actionTaken: 'none' };
  }

  // 1. Filter out poor GPS accuracy (> 80m) to prevent false geofence triggers
  const accuracyVal = validateLocationAccuracy(accuracy);
  if (!accuracyVal.isAcceptable) {
    return { actionTaken: 'none' };
  }

  const nowMs = Date.now();
  const nowIso = new Date().toISOString();
  const userId = currentUser.uid;

  // Retrieve current candidate dwell for this user
  let currentCandidate = activeDwellByUser.get(userId) || null;

  // 2. If already tracking a candidate shop
  if (currentCandidate) {
    // Find customer doc
    const currentCustomer = allCustomers.find((c) => c.id === currentCandidate!.customerId);

    if (
      currentCustomer &&
      typeof currentCustomer.latitude === 'number' &&
      typeof currentCustomer.longitude === 'number'
    ) {
      const dist = calculateDistanceMeters(
        currentLat,
        currentLon,
        currentCustomer.latitude,
        currentCustomer.longitude
      );

      currentCandidate.lastPingMs = nowMs;
      currentCandidate.lastDistanceMeters = dist;
      currentCandidate.lastLatitude = currentLat;
      currentCandidate.lastLongitude = currentLon;
      currentCandidate.lastAccuracyMeters = accuracy;

      // Check if seller has moved outside the EXIT radius (150m)
      if (dist > EXIT_RADIUS_METERS) {
        // Seller has exited the geofence
        const dwellDurationMs = nowMs - currentCandidate.enteredAtMs;
        const dwellMinutes = Math.max(1, Math.round(dwellDurationMs / 60000));

        if (currentCandidate.isConfirmed && currentCandidate.visitDocId) {
          // Complete and finalize the existing active visit in Firestore
          try {
            await autoCloseCustomerVisit(currentUser, currentCandidate.visitDocId, {
              checkOutLatitude: currentLat,
              checkOutLongitude: currentLon,
              checkOutAccuracyMeters: accuracy,
              checkOutTime: nowIso,
              durationMinutes: dwellMinutes,
              sessionId: activeSession.id
            });

            if (params.onVisitCompleted) {
              params.onVisitCompleted(currentCandidate.visitDocId, dwellMinutes);
            }
          } catch (err) {
            console.error('Error auto-completing customer visit:', err);
          }
        } else if (dwellDurationMs >= MIN_VISIT_DWELL_MS) {
          // Met dwell threshold right upon exiting: record complete visit
          try {
            const newVisitId = await autoCreateAndCompleteVisit(currentUser, {
              sessionId: activeSession.id,
              customerId: currentCustomer.id,
              shopName: currentCustomer.shopName,
              ownerName: currentCustomer.ownerName,
              checkInTime: new Date(currentCandidate.enteredAtMs).toISOString(),
              checkInLat: currentCandidate.lastLatitude,
              checkInLon: currentCandidate.lastLongitude,
              checkInAccuracy: currentCandidate.lastAccuracyMeters,
              checkOutTime: nowIso,
              checkOutLat: currentLat,
              checkOutLon: currentLon,
              checkOutAccuracy: accuracy,
              durationMinutes: dwellMinutes,
              distanceFromShopMeters: dist
            });

            if (params.onVisitCompleted && newVisitId) {
              params.onVisitCompleted(newVisitId, dwellMinutes);
            }
          } catch (err) {
            console.error('Error creating auto visit on exit:', err);
          }
        }

        // Reset dwell state so repeat visits later in the day can be detected cleanly
        activeDwellByUser.delete(userId);
        return {
          actionTaken: 'visit_exited',
          currentShopName: currentCustomer.shopName,
          distanceMeters: dist,
          dwellMinutes
        };
      }

      // Seller is still inside <= 150m boundary!
      const dwellDurationMs = nowMs - currentCandidate.enteredAtMs;
      const dwellMinutes = Math.floor(dwellDurationMs / 60000);

      // Check if candidate has now reached the 3-minute dwell requirement to confirm in Firestore
      if (!currentCandidate.isConfirmed && dwellDurationMs >= MIN_VISIT_DWELL_MS) {
        try {
          const visitDoc = await autoCreateActiveCustomerVisit(currentUser, {
            sessionId: activeSession.id,
            customerId: currentCustomer.id,
            shopName: currentCustomer.shopName,
            ownerName: currentCustomer.ownerName,
            checkInTime: new Date(currentCandidate.enteredAtMs).toISOString(),
            checkInLat: currentCandidate.lastLatitude,
            checkInLon: currentCandidate.lastLongitude,
            checkInAccuracy: currentCandidate.lastAccuracyMeters,
            distanceFromShopMeters: dist
          });

          if (visitDoc) {
            currentCandidate.visitDocId = visitDoc.id;
            currentCandidate.isConfirmed = true;
            activeDwellByUser.set(userId, currentCandidate);

            if (params.onVisitCreated) {
              params.onVisitCreated(visitDoc);
            }

            return {
              actionTaken: 'visit_confirmed',
              currentShopName: currentCustomer.shopName,
              distanceMeters: dist,
              dwellMinutes,
              visitId: visitDoc.id
            };
          }
        } catch (err) {
          console.error('Error auto-creating customer visit doc:', err);
        }
      }

      return {
        actionTaken: 'in_progress',
        currentShopName: currentCustomer.shopName,
        distanceMeters: dist,
        dwellMinutes,
        visitId: currentCandidate.visitDocId || undefined
      };
    } else {
      // Customer removed or coordinates invalid, clear candidate
      activeDwellByUser.delete(userId);
    }
  }

  // 3. Not currently dwelling at a shop: Check if entering <= 100m of any customer shop
  // Find nearest customer with valid GPS coordinates
  let nearestCustomer: Customer | null = null;
  let minDistance = Infinity;

  for (const customer of allCustomers) {
    if (
      typeof customer.latitude === 'number' &&
      typeof customer.longitude === 'number' &&
      !isNaN(customer.latitude) &&
      !isNaN(customer.longitude) &&
      customer.latitude !== 0 &&
      customer.longitude !== 0
    ) {
      const dist = calculateDistanceMeters(
        currentLat,
        currentLon,
        customer.latitude,
        customer.longitude
      );

      if (dist < minDistance) {
        minDistance = dist;
        nearestCustomer = customer;
      }
    }
  }

  // Check if seller is within ENTRY_RADIUS_METERS (100m)
  if (nearestCustomer && minDistance <= ENTRY_RADIUS_METERS) {
    const newCandidate: DwellCandidateState = {
      customerId: nearestCustomer.id,
      shopName: nearestCustomer.shopName || 'Retail Shop',
      ownerName: nearestCustomer.ownerName || 'Merchant',
      enteredAtMs: nowMs,
      lastPingMs: nowMs,
      lastDistanceMeters: minDistance,
      lastLatitude: currentLat,
      lastLongitude: currentLon,
      lastAccuracyMeters: accuracy,
      visitDocId: null,
      isConfirmed: false
    };

    activeDwellByUser.set(userId, newCandidate);

    return {
      actionTaken: 'dwell_started',
      currentShopName: nearestCustomer.shopName,
      distanceMeters: minDistance,
      dwellMinutes: 0
    };
  }

  return { actionTaken: 'none' };
}

/**
 * Creates an active / ongoing CustomerVisit in Firestore automatically.
 */
async function autoCreateActiveCustomerVisit(
  currentUser: AuthUser,
  data: {
    sessionId: string;
    customerId: string;
    shopName: string;
    ownerName: string;
    checkInTime: string;
    checkInLat: number;
    checkInLon: number;
    checkInAccuracy: number;
    distanceFromShopMeters: number;
  }
): Promise<CustomerVisit | null> {
  try {
    const visitRef = doc(collection(db, 'customer_visits'));
    const visitId = visitRef.id;

    // Check count of visits to this shop today for repeat visit counter
    let todayVisitIndex = 1;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const visitsCol = collection(db, 'customer_visits');
      const q = query(
        visitsCol,
        where('userId', '==', currentUser.uid),
        where('customerId', '==', data.customerId),
        where('checkInTime', '>=', todayStart.toISOString())
      );
      const snap = await getDocs(q);
      todayVisitIndex = snap.size + 1;
    } catch {
      // Fallback
    }

    const visitDoc: CustomerVisit = {
      id: visitId,
      visitId: visitId,
      sessionId: data.sessionId,
      userId: currentUser.uid,
      userName: currentUser.name || 'Sales Staff',
      customerId: data.customerId,
      shopName: data.shopName,
      ownerName: data.ownerName,
      checkInTime: data.checkInTime,
      checkInLatitude: data.checkInLat,
      checkInLongitude: data.checkInLon,
      checkInAccuracyMeters: data.checkInAccuracy,
      checkOutTime: null,
      checkOutLatitude: null,
      checkOutLongitude: null,
      checkOutAccuracyMeters: null,
      durationMinutes: null,
      visitOutcome: 'follow_up',
      notes: `Auto-Detected via GPS Geofence (100m proximity, Visit #${todayVisitIndex} today)`,
      orderId: null,
      paymentId: null,
      distanceFromShopMeters: data.distanceFromShopMeters,
      isGpsVerified: true,
      verificationStatus: 'verified',
      rejectionReason: null
    };

    await setDoc(visitRef, cleanUndefined(visitDoc));
    return visitDoc;
  } catch (err) {
    console.error('Error in autoCreateActiveCustomerVisit:', err);
    return null;
  }
}

/**
 * Creates and completes a visit in a single batch (used when dwell threshold is confirmed on exit).
 */
async function autoCreateAndCompleteVisit(
  currentUser: AuthUser,
  data: {
    sessionId: string;
    customerId: string;
    shopName: string;
    ownerName: string;
    checkInTime: string;
    checkInLat: number;
    checkInLon: number;
    checkInAccuracy: number;
    checkOutTime: string;
    checkOutLat: number;
    checkOutLon: number;
    checkOutAccuracy: number;
    durationMinutes: number;
    distanceFromShopMeters: number;
  }
): Promise<string | null> {
  try {
    const visitRef = doc(collection(db, 'customer_visits'));
    const visitId = visitRef.id;

    // Check if any order was placed for this customer in this session/day
    let outcome: CustomerVisitOutcome = 'follow_up';
    let linkedOrderId: string | null = null;
    let linkedPaymentId: string | null = null;

    try {
      const ordersQ = query(
        collection(db, 'orders'),
        where('customerId', '==', data.customerId),
        where('salesUserId', '==', currentUser.uid),
        limit(5)
      );
      const ordersSnap = await getDocs(ordersQ);
      if (!ordersSnap.empty) {
        const recentOrder = ordersSnap.docs[0];
        outcome = 'order_booked';
        linkedOrderId = recentOrder.id;
      }
    } catch {
      // Safe fallback
    }

    const visitDoc: CustomerVisit = {
      id: visitId,
      visitId: visitId,
      sessionId: data.sessionId,
      userId: currentUser.uid,
      userName: currentUser.name || 'Sales Staff',
      customerId: data.customerId,
      shopName: data.shopName,
      ownerName: data.ownerName,
      checkInTime: data.checkInTime,
      checkInLatitude: data.checkInLat,
      checkInLongitude: data.checkInLon,
      checkInAccuracyMeters: data.checkInAccuracy,
      checkOutTime: data.checkOutTime,
      checkOutLatitude: data.checkOutLat,
      checkOutLongitude: data.checkOutLon,
      checkOutAccuracyMeters: data.checkOutAccuracy,
      durationMinutes: data.durationMinutes,
      visitOutcome: outcome,
      notes: `Auto-Detected via GPS Geofence (${data.durationMinutes}m dwell)`,
      orderId: linkedOrderId,
      paymentId: linkedPaymentId,
      distanceFromShopMeters: data.distanceFromShopMeters,
      isGpsVerified: true,
      verificationStatus: 'verified',
      rejectionReason: null
    };

    const batch = writeBatch(db);
    batch.set(visitRef, cleanUndefined(visitDoc));

    // Update parent session counter
    if (data.sessionId) {
      const sessionRef = doc(db, 'field_duty_sessions', data.sessionId);
      const sessSnap = await getDoc(sessionRef);
      if (sessSnap.exists()) {
        const sessData = sessSnap.data() as FieldDutySession;
        batch.update(sessionRef, {
          totalVisitsCompleted: (sessData.totalVisitsCompleted || 0) + 1,
          updatedAt: data.checkOutTime
        });
      }
    }

    await batch.commit();
    return visitId;
  } catch (err) {
    console.error('Error in autoCreateAndCompleteVisit:', err);
    return null;
  }
}

/**
 * Automatically finalizes/checks out an existing active CustomerVisit upon leaving the geofence.
 */
async function autoCloseCustomerVisit(
  currentUser: AuthUser,
  visitId: string,
  data: {
    checkOutLatitude: number;
    checkOutLongitude: number;
    checkOutAccuracyMeters: number;
    checkOutTime: string;
    durationMinutes: number;
    sessionId: string;
  }
): Promise<void> {
  const visitRef = doc(db, 'customer_visits', visitId);
  const visitSnap = await getDoc(visitRef);
  if (!visitSnap.exists()) return;

  const existingVisit = visitSnap.data() as CustomerVisit;

  // Check if an order or payment was booked during this visit
  let outcome: CustomerVisitOutcome = existingVisit.visitOutcome || 'follow_up';
  if (existingVisit.orderId) {
    outcome = 'order_booked';
  } else if (existingVisit.paymentId) {
    outcome = 'payment_collected';
  }

  const updates: Partial<CustomerVisit> = {
    checkOutTime: data.checkOutTime,
    checkOutLatitude: data.checkOutLatitude,
    checkOutLongitude: data.checkOutLongitude,
    checkOutAccuracyMeters: data.checkOutAccuracyMeters,
    durationMinutes: data.durationMinutes,
    visitOutcome: outcome,
    notes: existingVisit.notes ? `${existingVisit.notes} (Completed: ${data.durationMinutes}m dwell)` : `Auto-Completed (${data.durationMinutes}m dwell)`
  };

  const batch = writeBatch(db);
  batch.update(visitRef, cleanUndefined(updates));

  // Increment session visits completed count if not previously completed
  if (!existingVisit.checkOutTime && data.sessionId) {
    const sessionRef = doc(db, 'field_duty_sessions', data.sessionId);
    const sessSnap = await getDoc(sessionRef);
    if (sessSnap.exists()) {
      const sessData = sessSnap.data() as FieldDutySession;
      batch.update(sessionRef, {
        totalVisitsCompleted: (sessData.totalVisitsCompleted || 0) + 1,
        updatedAt: data.checkOutTime
      });
    }
  }

  await batch.commit();
}

/**
 * Auto-links a newly placed order or payment to the active or today's customer visit.
 */
export async function autoLinkOrderOrPaymentToVisit(params: {
  userId: string;
  customerId: string;
  orderId?: string;
  paymentId?: string;
  totalAmount?: number;
}): Promise<void> {
  try {
    const { userId, customerId, orderId, paymentId } = params;
    if (!userId || !customerId) return;

    // 1. Check for active visit
    const visitsCol = collection(db, 'customer_visits');
    const q = query(
      visitsCol,
      where('userId', '==', userId),
      where('customerId', '==', customerId),
      limit(5)
    );

    const snap = await getDocs(q);
    if (snap.empty) return;

    // Find the most recent visit today
    const nowIso = new Date().toISOString();
    const sortedDocs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as CustomerVisit))
      .sort((a, b) => (b.checkInTime || '').localeCompare(a.checkInTime || ''));

    const targetVisit = sortedDocs[0];
    if (!targetVisit) return;

    const updates: Partial<CustomerVisit> = {};
    if (orderId) {
      updates.orderId = orderId;
      updates.visitOutcome = 'order_booked';
    }
    if (paymentId) {
      updates.paymentId = paymentId;
      if (!updates.visitOutcome || updates.visitOutcome === 'follow_up') {
        updates.visitOutcome = 'payment_collected';
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'customer_visits', targetVisit.id), cleanUndefined(updates));
    }
  } catch (err) {
    console.warn('Could not auto-link order/payment to visit:', err);
  }
}
