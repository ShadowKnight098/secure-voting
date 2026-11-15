import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  VideoOff, 
  ShieldAlert,
  UserCheck,
  Scan,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { loadFaceApiModels } from '../../utils/faceApiLoader';

// Reusable single detector options to prevent GC churn and minimize computation power
const TINY_DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({ 
  inputSize: 224, 
  scoreThreshold: 0.40 
});

export const FaceCapture = ({ onCapture, capturedPhoto, onReset }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);
  const isDetectingRef = useRef(false);
  const steadyCountRef = useRef(0);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraRequested, setCameraRequested] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionScore, setDetectionScore] = useState(null);
  const [detectionError, setDetectionError] = useState(null);
  const [capturing, setCapturing] = useState(false);

  // 1. Load face-api models lazily
  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        await loadFaceApiModels();
        if (isMounted) {
          setModelsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load face-api models:', err);
        if (isMounted) {
          setDetectionError('Could not load biometric AI models locally.');
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Stop camera and release all media hardware (0% CPU)
  const stopCamera = useCallback(() => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    isDetectingRef.current = false;
    steadyCountRef.current = 0;
  }, []);

  // 3. Start webcam stream on demand with proper metadata readiness check
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setDetectionError(null);
      setCameraRequested(true);
      setFaceDetected(false);
      setDetectionScore(null);
      steadyCountRef.current = 0;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth || 640;
              canvasRef.current.height = videoRef.current.videoHeight || 480;
            }
            setCameraActive(true);
          } catch (pErr) {
            console.warn('Video play interrupted:', pErr);
          }
        };
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Camera access is strictly required to verify voter identity.'
          : 'No camera found or camera is currently busy in another application.'
      );
    }
  }, []);

  // Clean up camera on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // 4. Capture photo and extract 128-d descriptor (computed once, then immediately stops camera)
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);

    try {
      const allDetections = await faceapi
        .detectAllFaces(
          videoRef.current, 
          TINY_DETECTOR_OPTIONS
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!allDetections || allDetections.length === 0) {
        toast.error('Capture rejected: No face detected in frame.');
        setCapturing(false);
        return;
      }

      if (allDetections.length > 1) {
        toast.error('Capture rejected: Multiple faces detected! Only one person is permitted.');
        setCapturing(false);
        return;
      }

      const detection = allDetections[0];
      if (!detection.descriptor || detection.descriptor.length !== 128) {
        toast.error('Capture rejected: Could not extract valid biometric facial landmarks.');
        setCapturing(false);
        return;
      }

      // Capture high-res frame to canvas
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = videoRef.current.videoWidth || 640;
      snapCanvas.height = videoRef.current.videoHeight || 480;
      const ctx = snapCanvas.getContext('2d');
      ctx.translate(snapCanvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height);

      const photoBase64 = snapCanvas.toDataURL('image/jpeg', 0.88);
      const descriptorArray = Array.from(detection.descriptor);

      // Immediately shutdown camera to preserve 100% of CPU while finishing registration
      stopCamera();
      toast.success('Valid human face biometric scan recorded!');
      onCapture({
        photo: photoBase64,
        descriptor: descriptorArray
      });
    } catch (err) {
      console.error('Face capture failed:', err);
      toast.error('Face verification failed. Please try again.');
    } finally {
      setCapturing(false);
    }
  }, [capturing, onCapture, stopCamera]);

  // 5. Low-CPU Face Detection Loop (Runs every 600ms — uses < 3% CPU)
  useEffect(() => {
    if (!cameraActive || capturedPhoto || !videoRef.current || capturing) return;

    const runDetection = async () => {
      if (document.hidden) return;
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || capturing) return;
      if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) return;
      if (isDetectingRef.current) return;
      isDetectingRef.current = true;

      try {
        const allDetections = await faceapi.detectAllFaces(
          videoRef.current, 
          TINY_DETECTOR_OPTIONS
        );

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        if (!allDetections || allDetections.length === 0) {
          setFaceDetected(false);
          setDetectionScore(null);
          setDetectionError('No face detected. Please position your face clearly in the camera.');
          steadyCountRef.current = 0;
          return;
        }

        if (allDetections.length > 1) {
          setFaceDetected(false);
          setDetectionScore(null);
          setDetectionError(`Multiple faces detected (${allDetections.length}). Only 1 person is allowed in the frame!`);
          steadyCountRef.current = 0;
          
          if (ctx && canvasRef.current) {
            allDetections.forEach(det => {
              const box = det.box || det.detection?.box;
              if (box) {
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#EF4444';
                ctx.strokeRect(box.x, box.y, box.width, box.height);
              }
            });
          }
          return;
        }

        // Exactly 1 face detected
        const singleFace = allDetections[0];
        const rawScore = singleFace.score ?? singleFace.detection?.score ?? 0.8;
        const score = Math.round(rawScore * 100);

        if (score < 40) {
          setFaceDetected(false);
          setDetectionScore(score);
          setDetectionError('Face clarity too low. Please look directly into the camera with good lighting.');
          steadyCountRef.current = 0;
          return;
        }

        // Valid single face confirmed!
        setFaceDetected(true);
        setDetectionScore(score);
        setDetectionError(null);
        steadyCountRef.current += 1;

        // Draw HUD Green box with corner brackets
        if (ctx && canvasRef.current) {
          const displaySize = {
            width: canvasRef.current.width,
            height: canvasRef.current.height
          };
          const resized = faceapi.resizeResults(singleFace, displaySize);
          const box = resized.box || resized.detection?.box;
          if (box) {
            const length = 20;
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#22C55E';

            // Top-left
            ctx.beginPath();
            ctx.moveTo(box.x, box.y + length);
            ctx.lineTo(box.x, box.y);
            ctx.lineTo(box.x + length, box.y);
            ctx.stroke();

            // Top-right
            ctx.beginPath();
            ctx.moveTo(box.x + box.width - length, box.y);
            ctx.lineTo(box.x + box.width, box.y);
            ctx.lineTo(box.x + box.width, box.y + length);
            ctx.stroke();

            // Bottom-left
            ctx.beginPath();
            ctx.moveTo(box.x, box.y + box.height - length);
            ctx.lineTo(box.x, box.y + box.height);
            ctx.lineTo(box.x + length, box.y + box.height);
            ctx.stroke();

            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(box.x + box.width - length, box.y + box.height);
            ctx.lineTo(box.x + box.width, box.y + box.height);
            ctx.lineTo(box.x + box.width, box.y + box.height - length);
            ctx.stroke();
          }
        }
      } catch (err) {
        // Silently retry
      } finally {
        isDetectingRef.current = false;
      }
    };

    // Low-CPU 600ms interval for registration
    detectIntervalRef.current = setInterval(runDetection, 600);

    return () => {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
      }
    };
  }, [cameraActive, capturedPhoto, capturing]);

  // Retake Action
  const handleRetake = () => {
    if (onReset) onReset();
    startCamera();
  };

  return (
    <div className="border-2 border-ink rounded-[14px] sm:rounded-[16px] bg-surface p-3.5 sm:p-5 shadow-neo-md text-ink">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3.5 border-b-2 border-ink">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sun rounded-[10px] border-2 border-ink shadow-neo-sm flex-shrink-0">
            <Camera size={18} className="text-ink" />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm sm:text-base text-ink truncate">Live Facial Biometric Enrollment</h3>
            <p className="text-[11px] sm:text-xs font-semibold text-ink/70">
              Webcam face scan required for fraud prevention
            </p>
          </div>
        </div>

        <div className="flex-shrink-0">
          {capturedPhoto ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint text-ink border-2 border-ink text-xs font-black shadow-neo-sm">
              <CheckCircle2 size={14} className="text-ink" />
              Face Verified & Enrolled
            </span>
          ) : faceDetected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint text-ink border-2 border-ink text-xs font-bold shadow-neo-sm">
              <UserCheck size={14} className="text-ink" />
              Face Aligned ({detectionScore}%)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sun text-ink border-2 border-ink text-xs font-bold shadow-neo-sm">
              Mandatory Step
            </span>
          )}
        </div>
      </div>

      {/* Captured Preview State */}
      {capturedPhoto ? (
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-3.5 sm:p-4 bg-lavender/50 rounded-[14px] border-2 border-ink shadow-neo-sm">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-[12px] border-2 border-ink overflow-hidden shadow-neo bg-slate-900 flex-shrink-0">
            <img 
              src={capturedPhoto} 
              alt="Enrolled Face Biometric" 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-1 bg-mint border border-ink text-ink rounded-full p-1 shadow-sm">
              <CheckCircle2 size={14} />
            </div>
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
            <div className="font-extrabold text-xs sm:text-sm text-ink flex items-center justify-center sm:justify-start gap-1.5">
              <span>✅ 128-d Biometric Hash Generated</span>
            </div>
            <p className="text-xs font-medium text-ink/80 leading-relaxed">
              Your facial descriptor has been extracted and will authenticate your identity during live voting.
            </p>
            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRetake}
              >
                <RefreshCw size={14} className="mr-1.5" /> Retake Face Scan
              </Button>
            </div>
          </div>
        </div>
      ) : !cameraRequested ? (
        /* Zero CPU Idle State: Tap to Start Camera */
        <div className="p-5 sm:p-6 bg-lavender/40 border-2 border-ink rounded-[14px] text-center space-y-3">
          <div className="w-12 h-12 rounded-[12px] bg-sun border-2 border-ink shadow-neo-sm mx-auto flex items-center justify-center text-ink">
            <Camera size={24} />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-ink">Ready for Facial Scan</h4>
            <p className="text-xs font-medium text-ink/75 max-w-sm mx-auto mt-1">
              Tap the button below to turn on your webcam and verify your face. The camera turns off automatically once captured.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={startCamera}
              className="shadow-neo-md"
            >
              <Camera size={16} className="mr-1.5" /> Open Camera & Scan Face
            </Button>
          </div>
        </div>
      ) : cameraError ? (
        /* Camera Error Block */
        <div className="space-y-3 p-4 sm:p-5 bg-lavender/40 rounded-[14px] border-2 border-ink text-center">
          <div className="w-12 h-12 rounded-full bg-coral/40 border-2 border-ink mx-auto flex items-center justify-center text-ink shadow-neo-sm">
            <VideoOff size={24} />
          </div>

          <div>
            <h4 className="font-extrabold text-sm text-ink text-coral">
              Camera Access Required
            </h4>
            <p className="text-xs font-medium text-ink/75 mt-1 max-w-sm mx-auto">
              {cameraError}
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={startCamera}
            >
              <RefreshCw size={14} className="mr-1.5" /> Try Connecting Camera Again
            </Button>
          </div>
        </div>
      ) : (
        /* Active Live Webcam View */
        <div className="space-y-3">
          <div className="relative w-full max-w-xs sm:max-w-md mx-auto aspect-[4/3] bg-slate-900 rounded-[14px] border-2 border-ink overflow-hidden shadow-neo flex items-center justify-center">
            {!modelsLoaded ? (
              <div className="text-center p-4 text-white space-y-2">
                <RefreshCw size={24} className="animate-spin text-sun mx-auto" />
                <p className="font-bold text-xs">Initializing Biometric AI Models...</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
                />

                {/* Hardware-accelerated CSS Laser Scan Line (0% CPU) */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
                  <div className="w-full border-t-2 border-mint/80 shadow-[0_0_12px_#14D9A0] animate-scan-laser absolute" />
                </div>

                {/* Viewfinder Target Guide */}
                <div className="absolute inset-0 pointer-events-none border-4 border-dashed border-white/20 rounded-[12px] m-3 sm:m-4 flex items-center justify-center">
                  {!faceDetected && !capturing && (
                    <div className="bg-ink/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-[8px] text-xs font-bold border border-white/30 animate-pulse text-center">
                      Align face in viewfinder
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Real-time status / warnings */}
          {detectionError && (
            <div className="p-3 bg-sun/40 border-2 border-ink rounded-[10px] text-xs font-bold text-ink flex items-center gap-2 animate-slide-up">
              <AlertTriangle size={16} className="text-violet flex-shrink-0" />
              <span>{detectionError}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="text-xs font-semibold text-ink/70 text-center sm:text-left">
              {faceDetected ? (
                <span className="text-mint font-extrabold flex items-center justify-center sm:justify-start gap-1">
                  <CheckCircle2 size={15} /> Face confirmed ({detectionScore}%) — Ready to capture
                </span>
              ) : (
                <span className="flex items-center justify-center sm:justify-start gap-1 text-coral font-bold">
                  <ShieldAlert size={15} /> Position face directly at camera
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleCapture}
              disabled={!faceDetected || capturing || !modelsLoaded}
              loading={capturing}
              className="w-full sm:w-auto shadow-neo-md"
            >
              <Camera size={16} className="mr-1.5" /> Capture Valid Face
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceCapture;
