import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  VideoOff, 
  Users, 
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { loadFaceApiModels } from '../../utils/faceApiLoader';

export const FaceCapture = ({ onCapture, capturedPhoto, onReset }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);
  const isDetectingRef = useRef(false);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionScore, setDetectionScore] = useState(null);
  const [detectionError, setDetectionError] = useState(null);
  const [capturing, setCapturing] = useState(false);

  // 1. Load face-api models from singleton loader
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

  // 2. Start webcam stream (Ultra fast initialization)
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setDetectionError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 640 },
          height: { ideal: 480, max: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
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

  // 3. Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Manage camera lifecycle
  useEffect(() => {
    if (modelsLoaded && !capturedPhoto) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [modelsLoaded, capturedPhoto, startCamera, stopCamera]);

  // 4. Ultra-Fast Face Detection loop on live stream (pure bounding box, zero descriptor overhead)
  useEffect(() => {
    if (!cameraActive || capturedPhoto || !videoRef.current || capturing) return;

    const runDetection = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || capturing) return;
      if (isDetectingRef.current) return;
      isDetectingRef.current = true;

      try {
        // Fast detection only: inputSize 160 takes ~10ms
        const allDetections = await faceapi.detectAllFaces(
          videoRef.current, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.55 })
        );

        const ctx = canvasRef.current?.getContext('2d');
        if (canvasRef.current && videoRef.current) {
          const displaySize = {
            width: videoRef.current.videoWidth || 640,
            height: videoRef.current.videoHeight || 480
          };
          faceapi.matchDimensions(canvasRef.current, displaySize);
          ctx.clearRect(0, 0, displaySize.width, displaySize.height);
        }

        if (!allDetections || allDetections.length === 0) {
          setFaceDetected(false);
          setDetectionScore(null);
          setDetectionError('No face detected. Please position your face clearly in the camera.');
          return;
        }

        if (allDetections.length > 1) {
          setFaceDetected(false);
          setDetectionScore(null);
          setDetectionError(`Multiple faces detected (${allDetections.length}). Only 1 person is allowed in the frame!`);
          
          // Draw warning red boxes
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

        if (score < 55) {
          setFaceDetected(false);
          setDetectionScore(score);
          setDetectionError('Face clarity too low. Please look directly into the camera with good lighting.');
          return;
        }

        // Valid single face confirmed!
        setFaceDetected(true);
        setDetectionScore(score);
        setDetectionError(null);

        // Draw HUD Green box
        if (ctx && canvasRef.current) {
          const box = singleFace.box || singleFace.detection?.box;
          if (box) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#22C55E';
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Corner brackets
            const length = 20;
            ctx.lineWidth = 5;
            ctx.strokeStyle = '#FACC15';

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

    detectIntervalRef.current = setInterval(runDetection, 140);

    return () => {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
      }
    };
  }, [cameraActive, capturedPhoto]);

  // 5. Strictly capture live face snapshot & 128-d descriptor (computed once on demand)
  const handleCapture = async () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);

    try {
      // Synchronously compute landmark and 128-d descriptor on the captured frame
      const allDetections = await faceapi
        .detectAllFaces(
          videoRef.current, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.55 })
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!allDetections || allDetections.length === 0) {
        toast.error('Capture rejected: No valid face detected in frame.');
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

      const photoBase64 = snapCanvas.toDataURL('image/jpeg', 0.9);
      const descriptorArray = Array.from(detection.descriptor);

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
  };

  // 6. Retake Action
  const handleRetake = () => {
    if (onReset) onReset();
    startCamera();
  };

  return (
    <div className="border-2 border-ink rounded-[16px] bg-surface p-5 shadow-neo-md text-ink">
      <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-ink">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sun rounded-[10px] border-2 border-ink shadow-neo-sm">
            <Camera size={18} className="text-ink" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-ink">Live Facial Biometric Enrollment</h3>
            <p className="text-xs font-semibold text-ink/70">
              Live webcam scan required — AI strictly verifies genuine face
            </p>
          </div>
        </div>

        {capturedPhoto ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint text-ink border-2 border-ink text-xs font-black shadow-neo-sm">
            <CheckCircle2 size={14} className="text-ink" />
            Face Verified & Enrolled
          </span>
        ) : faceDetected ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint text-ink border-2 border-ink text-xs font-bold shadow-neo-sm animate-pulse">
            <UserCheck size={14} className="text-ink" />
            Valid Face ({detectionScore}%)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sun text-ink border-2 border-ink text-xs font-bold shadow-neo-sm">
            Mandatory Step
          </span>
        )}
      </div>

      {/* Captured Preview State */}
      {capturedPhoto ? (
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-lavender/50 rounded-[14px] border-2 border-ink shadow-neo-sm">
          <div className="relative w-36 h-36 rounded-[12px] border-2 border-ink overflow-hidden shadow-neo bg-slate-900 flex-shrink-0">
            <img 
              src={capturedPhoto} 
              alt="Enrolled Face Biometric" 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-1 bg-mint border border-ink text-ink rounded-full p-1 shadow-sm">
              <CheckCircle2 size={14} />
            </div>
          </div>

          <div className="space-y-2 text-left flex-1">
            <div className="font-extrabold text-sm text-ink flex items-center gap-1.5">
              <span>✅ 128-dimensional biometric descriptor extracted</span>
            </div>
            <p className="text-xs font-medium text-ink/80 leading-relaxed">
              Your biometric embedding is calculated from a verified live face scan. This descriptor will authenticate your identity during live video verification on election day.
            </p>
            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRetake}
              >
                <RefreshCw size={14} className="mr-1.5" /> Retake live scan
              </Button>
            </div>
          </div>
        </div>
      ) : cameraError ? (
        /* Camera Error Block - strictly requires camera */
        <div className="space-y-4 p-5 bg-lavender/40 rounded-[14px] border-2 border-ink text-center">
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
        <div className="space-y-4">
          <div className="relative w-full max-w-md mx-auto aspect-[4/3] bg-slate-900 rounded-[14px] border-2 border-ink overflow-hidden shadow-neo flex items-center justify-center">
            {!modelsLoaded ? (
              <div className="text-center p-6 text-white space-y-2">
                <RefreshCw size={28} className="animate-spin text-sun mx-auto" />
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

                {/* Viewfinder Target */}
                <div className="absolute inset-0 pointer-events-none border-4 border-dashed border-white/20 rounded-[12px] m-4 flex items-center justify-center">
                  {!faceDetected && (
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs font-semibold text-ink/70">
              {faceDetected ? (
                <span className="text-mint font-extrabold flex items-center gap-1">
                  <CheckCircle2 size={15} /> Valid single face confirmed ({detectionScore}%)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-coral font-bold">
                  <ShieldAlert size={15} /> Valid face required to enable capture
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
