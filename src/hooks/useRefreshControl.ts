import { useState, useCallback } from 'react';

interface UseRefreshControlProps {
  onRefresh?: () => Promise<void> | void;
  initialRefreshing?: boolean;
}

export const useRefreshControl = ({ 
  onRefresh, 
  initialRefreshing = false 
}: UseRefreshControlProps = {}) => {
  const [isRefreshing, setIsRefreshing] = useState(initialRefreshing);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  return {
    isRefreshing,
    handleRefresh,
    setIsRefreshing,
  };
}; 