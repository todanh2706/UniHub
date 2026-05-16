import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  return isOnline;
};
