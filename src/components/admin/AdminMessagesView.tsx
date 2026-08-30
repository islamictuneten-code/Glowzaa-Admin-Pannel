import React, { useState, useEffect } from 'react';
import { AuthUser } from '../../types';
import { fetchStaffUsersFromFirestore } from '../../services/staffAuthService';
import { AdminMessagingCenter } from '../communication/AdminMessagingCenter';

export const AdminMessagesView: React.FC = () => {
  const [staffList, setStaffList] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadStaff = async () => {
      setIsLoading(true);
      try {
        const staff = await fetchStaffUsersFromFirestore();
        if (isMounted) {
          setStaffList(staff);
        }
      } catch (err) {
        console.warn('Load staff users notice in AdminMessagesView:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadStaff();
    return () => { isMounted = false; };
  }, []);

  return <AdminMessagingCenter staffUsers={staffList} />;
};
