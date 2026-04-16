import { useEffect } from 'react';

interface CustomSplashScreenProps {
  onFinish: () => void;
}

export function CustomSplashScreen({ onFinish }: CustomSplashScreenProps) {
  useEffect(() => {
    onFinish();
  }, []);
  return null;
}
