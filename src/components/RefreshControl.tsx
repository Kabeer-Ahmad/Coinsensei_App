import React from 'react';
import { RefreshControl as RNRefreshControl, RefreshControlProps } from 'react-native';

interface CustomRefreshControlProps extends Omit<RefreshControlProps, 'tintColor' | 'colors'> {
  color?: string;
}

export const CustomRefreshControl: React.FC<CustomRefreshControlProps> = ({ 
  color = '#09d2fe',
  ...props 
}) => {
  return (
    <RNRefreshControl
      tintColor={color}
      colors={[color]}
      {...props}
    />
  );
}; 