import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Navigation, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface AROverlayProps {
  isActive: boolean;
  onToggle: () => void;
  currentStep: number;
  directions: Array<{
    instruction: string;
    distance: number;
    direction: 'straight' | 'left' | 'right' | 'up' | 'down';
    floor?: number;
  }>;
  destination: string;
  onNextStep: () => void;
  onPrevStep: () => void;
}

export const AROverlay: React.FC<AROverlayProps> = ({
  isActive,
  onToggle,
  currentStep,
  directions,
  destination,
  onNextStep,
  onPrevStep
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [deviceOrientation, setDeviceOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });

  const handleOrientationChange = useCallback((event: DeviceOrientationEvent) => {
    setDeviceOrientation({
      alpha: event.alpha || 0,
      beta: event.beta || 0,
      gamma: event.gamma || 0
    });
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setHasPermission(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasPermission(false);
    }
  }, []);

  const requestOrientationPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 'requestPermission' in DeviceOrientationEvent) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientationChange);
        }
      } catch (error) {
        console.error('Error requesting orientation permission:', error);
      }
    } else {
      // For non-iOS devices
      window.addEventListener('deviceorientation', handleOrientationChange);
    }
  }, [handleOrientationChange]);

  useEffect(() => {
    if (isActive) {
      startCamera();
      requestOrientationPermission();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isActive, startCamera, requestOrientationPermission, stopCamera]);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'left': return <ArrowLeft className="w-8 h-8" />;
      case 'right': return <ArrowRight className="w-8 h-8" />;
      case 'up': return <ArrowUp className="w-8 h-8" />;
      case 'down': return <ArrowDown className="w-8 h-8" />;
      default: return <ArrowUp className="w-8 h-8" />;
    }
  };

  const currentDirection = directions[currentStep];

  if (!isActive) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg"
      >
        <Camera className="w-6 h-6" />
      </Button>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <Card className="p-6 m-4 text-center">
          <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
          <p className="text-gray-600 mb-4">
            Please allow camera access to use AR navigation
          </p>
          <div className="space-x-2">
            <Button onClick={startCamera} variant="default">
              Try Again
            </Button>
            <Button onClick={onToggle} variant="outline">
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* AR Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Compass/Direction Indicator */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div 
            className="w-32 h-32 border-4 border-blue-500 rounded-full bg-blue-500/20 flex items-center justify-center"
            style={{
              transform: `rotate(${deviceOrientation.alpha}deg)`
            }}
          >
            <div className="text-white text-center">
              {currentDirection && getDirectionIcon(currentDirection.direction)}
            </div>
          </div>
        </div>

        {/* Distance and Direction Text */}
        {currentDirection && (
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-6 py-3 rounded-lg text-center">
            <div className="text-2xl font-bold mb-1">
              {Math.round(currentDirection.distance)}m
            </div>
            <div className="text-sm opacity-90">
              {currentDirection.instruction}
            </div>
          </div>
        )}

        {/* Destination Info */}
        <div className="absolute top-4 left-4 right-4 bg-black/70 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">Navigating to</div>
              <div className="text-lg font-semibold">{destination}</div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">Step</div>
              <div className="text-lg font-semibold">
                {currentStep + 1} / {directions.length}
              </div>
            </div>
          </div>
        </div>

        {/* Floor Change Indicator */}
        {currentDirection?.floor && (
          <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-lg font-semibold">
            Floor {currentDirection.floor}
          </div>
        )}

        {/* Virtual Path Indicators */}
        <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  opacity: 1 - (i * 0.15)
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* AR Controls */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
        <div className="flex justify-between items-center">
          {/* Navigation Controls */}
          <div className="flex space-x-2">
            <Button
              onClick={onPrevStep}
              disabled={currentStep === 0}
              variant="secondary"
              size="sm"
              className="bg-black/70 text-white border-white/20"
            >
              Previous
            </Button>
            <Button
              onClick={onNextStep}
              disabled={currentStep >= directions.length - 1}
              variant="secondary"
              size="sm"
              className="bg-black/70 text-white border-white/20"
            >
              Next
            </Button>
          </div>

          {/* Exit AR Button */}
          <Button
            onClick={onToggle}
            variant="secondary"
            size="sm"
            className="bg-red-600/80 text-white hover:bg-red-700/80"
          >
            Exit AR
          </Button>
        </div>
      </div>

      {/* Crosshair/Center Point */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-8 h-8 border-2 border-white rounded-full bg-white/20">
          <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    </div>
  );
};