import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  VideoOff, 
  Lock,
  UserCheck,
  Scan
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { voterService } from '../../services/voterService';
import { loadFaceApiModels } from '../../utils/faceApiLoader';
import { getImageUrl } from '../../utils/imageUrl';

// Reusable single detector options instance to prevent GC churn and minimize CPU consumption
const TINY_DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({ 
  inputSize: 224, 
  scoreThreshold: 0.40 
});

export const FaceVerificationModal = ({ isOpen, onClose, electionId, onVerified }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectTimerRef = useRef(null);
  const isDetectingRef = useRef(false);
  const verifyingRef = useRef(false);
  const steadyCountRef = useRef(0);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionScore, setDetectionScore] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [registeredPhoto, setRegisteredPhoto] = useState(null);
  const [scanStatusText, setScanStatusText] = useState('Initializing camera...');

  // 1. Initialize face-api models and load voter registered photo thumbnail
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    steadyCountRef.current = 0;
    verifyingRef.current = false;

    const init = async () => {
      try {
        setScanStatusText('Loading neural biometric engine...');
        await loadFaceApiModels();
        if (isMounted) {
          setModelsLoaded(true);
          setScanStatusText('Position your face in the frame');
        }

        // Fetch registered photo for visual comparison preview
        try {
          const profile = await voterService.getProfile();
          if (isMounted && profile?.face_photo_url) {
            setRegisteredPhoto(profile.face_photo_url);
          }
        } catch (err) {
          console.warn('Could not load profile photo preview', err);
        }
      } catch (err) {
        console.error('Error loading verification models:', err);
        if (isMounted) {
          setErrorMessage('Could not load biometric AI models. Please refresh and try again.');
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 2. Stop camera and cancel all background timers
  const stopCamera = useCallback(() => {
    if (detectTimerRef.current) {
      clearInterval(detectTimerRef.current);
      detectTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    isDetectingRef.current = false;
  }, []);

  // 3. Start Camera with proper metadata readiness check
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setErrorMessage('');
      setVerificationResult(null);
      setFaceDetected(false);
      setDetectionScore(null);
      steadyCountRef.current = 0;
      verifyingRef.current = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
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
        
        // Wait until video metadata is loaded before attempting playback and dimension checks
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
            // Match canvas dimensions once
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth || 640;
              canvasRef.current.height = videoRef.current.videoHeight || 480;
            }
            setCameraActive(true);
            setScanStatusText('Align your face inside the viewfinder');
          } catch (playErr) {
            console.warn('Video play interrupted:', playErr);
          }
        };
      }
    } catch (err) {
      console.warn('Camera error in verification:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser to verify your identity.'
          : 'Unable to start camera. Please verify your camera is connected and not in use by another app.'
      );
    }
  }, []);

  // Sync camera start/stop with modal open state
  useEffect(() => {
    if (isOpen && modelsLoaded && !verificationResult) {
      startCamera();
    } else if (!isOpen) {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, modelsLoaded, verificationResult, startCamera, stopCamera]);

  // 4. Verification Action: extracts 128-d descriptor and validates with backend
  const handleVerify = useCallback(async () => {
    if (!videoRef.current || verifyingRef.current) return;
    
    // Pause background detection loop during verification to save 100% CPU
    verifyingRef.current = true;
    setVerifying(true);
    setErrorMessage('');
    setScanStatusText('Analyzing facial landmarks & sealing descriptor...');

    // Clear canvas HUD during descriptor extraction
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    try {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, TINY_DETECTOR_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) {
        setErrorMessage('No face detected! Please look directly into the camera with clear lighting.');
        verifyingRef.current = false;
        setVerifying(false);
        setScanStatusText('Please position your face directly in the frame');
        return;
      }

      if (detections.length > 1) {
        setErrorMessage(`Multiple faces detected (${detections.length}). Only 1 voter is permitted in the camera frame.`);
        verifyingRef.current = false;
        setVerifying(false);
        setScanStatusText('Only 1 voter allowed in frame');
        return;
      }

      const singleFace = detections[0];
      if (!singleFace.descriptor || singleFace.descriptor.length !== 128) {
        setErrorMessage('Facial biometric landmarks could not be clearly resolved. Please increase lighting.');
        verifyingRef.current = false;
        setVerifying(false);
        setScanStatusText('Improve lighting and look directly at camera');
        return;
      }

      const liveDescriptor = Array.from(singleFace.descriptor);

      // Call backend biometric verification API
      const response = await voterService.verifyFace({
        live_descriptor: liveDescriptor,
        election_id: electionId
      });

      if (response?.success && response.data?.verified) {
        stopCamera();
        setVerificationResult(response.data);
        setScanStatusText('Biometric authentication verified!');

        // Auto trigger success callback
        setTimeout(() => {
          onVerified(response.data.ballotToken);
        }, 1100);
      } else {
        const msg = response?.message || 'Biometric verification failed. Face does not match registered voter profile.';
        setErrorMessage(msg);
        setScanStatusText('Verification failed — face mismatch');
        verifyingRef.current = false;
        setVerifying(false);
      }
    } catch (err) {
      console.error('Verification error:', err);
      const msg = err.response?.data?.message || 'Biometric verification failed. Face does not match registered voter profile.';
      setErrorMessage(msg);
      setScanStatusText('Verification failed — retry scan');
      verifyingRef.current = false;
      setVerifying(false);
    }
  }, [electionId, onVerified, stopCamera]);

  // 5. Ultra-Low CPU Detection Loop (Runs every 500ms — uses < 5% CPU)
  useEffect(() => {
    if (!cameraActive || verificationResult || !videoRef.current || verifying) return;

    const runDetection = async () => {
      // Guard against hidden tab, ended video, or active verification
      if (document.hidden) return;
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
      if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) return;
      if (isDetectingRef.current || verifyingRef.current) return;

      isDetectingRef.current = true;

      try {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          TINY_DETECTOR_OPTIONS
        );

        if (verifyingRef.current) return;

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current && videoRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        if (detections && detections.length === 1) {
          const singleDetection = detections[0];
          const rawScore = singleDetection.score ?? singleDetection.detection?.score ?? 0.8;
          const score = Math.round(rawScore * 100);

          setFaceDetected(true);
          setDetectionScore(score);
          setErrorMessage('');

          // Draw lightweight HUD brackets around detected face
          if (ctx && canvasRef.current && videoRef.current) {
            const displaySize = {
              width: canvasRef.current.width,
              height: canvasRef.current.height
            };
            const resized = faceapi.resizeResults(singleDetection, displaySize);
            const box = resized.box || resized.detection?.box;
            if (box) {
              // Target HUD Corner Brackets
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

          steadyCountRef.current += 1;
          setScanStatusText(`Face aligned (${score}%) — scanning...`);

          // Auto-verify smoothly when a steady face is aligned for 2 checks (~1s)
          if (steadyCountRef.current >= 2 && !verifyingRef.current) {
            handleVerify();
          }
        } else if (detections && detections.length > 1) {
          steadyCountRef.current = 0;
          setFaceDetected(false);
          setDetectionScore(null);
          setErrorMessage(`Multiple faces detected (${detections.length}). Only 1 voter allowed in frame!`);
          setScanStatusText('Security alert: Multiple faces detected');
        } else {
          steadyCountRef.current = 0;
          setFaceDetected(false);
          setDetectionScore(null);
          setScanStatusText('Center face directly at the camera');
        }
      } catch (err) {
        // Silently skip on transient frame issues
      } finally {
        isDetectingRef.current = false;
      }
    };

    // Low-overhead 500ms interval: uses minimum CPU while remaining responsive
    detectTimerRef.current = setInterval(runDetection, 500);

    return () => {
      if (detectTimerRef.current) {
        clearInterval(detectTimerRef.current);
        detectTimerRef.current = null;
      }
    };
  }, [cameraActive, verificationResult, verifying, handleVerify]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !verifying && onClose()}
      title="Biometric Face Verification (Module 3)"
    >
      <div className="space-y-4 text-ink">
        {/* Anti-Fraud Banner */}
        <div className="bg-lavender/60 border-2 border-ink rounded-[12px] p-3 text-xs font-semibold flex items-center justify-between shadow-neo-sm">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-violet flex-shrink-0" />
            <span className="truncate">Anti-Fraud Biometric Identity Authentication</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-sun border border-ink text-[10px] font-black uppercase flex-shrink-0">
            Live Scan
          </span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-[12px] bg-coral/20 border-2 border-ink text-ink text-xs font-bold shadow-neo-sm flex items-center gap-2 animate-slide-up">
            <AlertTriangle size={18} className="text-coral flex-shrink-0" />
            <div className="flex-1">
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {verificationResult ? (
          /* Success Screen */
          <div className="text-center py-6 px-4 space-y-4 bg-mint/30 border-2 border-ink rounded-[14px] shadow-neo-md animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-mint border-2 border-ink mx-auto flex items-center justify-center text-ink shadow-neo">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 className="text-xl font-black text-ink">Identity Authenticated!</h3>
              <p className="text-xs font-bold text-ink/80 mt-1">
                Biometric match confirmed with {verificationResult.confidenceScore}% confidence.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface border-2 border-ink rounded-full text-xs font-black shadow-neo-sm">
              <ShieldCheck size={16} className="text-mint" />
              Unlocking ballot access...
            </div>
          </div>
        ) : cameraError ? (
          /* Camera Error View */
          <div className="p-5 bg-lavender/40 border-2 border-ink rounded-[14px] text-center space-y-3">
            <VideoOff size={32} className="mx-auto text-coral" />
            <h4 className="font-extrabold text-sm">{cameraError}</h4>
            <p className="text-xs font-medium text-ink/70">
              Live webcam access is required to authenticate your biometric identity.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Button variant="primary" size="sm" onClick={startCamera}>
                <RefreshCw size={14} className="mr-1.5" /> Reconnect Camera
              </Button>
            </div>
          </div>
        ) : (
          /* Live Camera View */
          <div className="space-y-3">
            <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-[14px] border-2 border-ink overflow-hidden shadow-neo flex items-center justify-center">
              {!modelsLoaded ? (
                <div className="text-center p-6 text-white space-y-2">
                  <RefreshCw size={28} className="animate-spin text-sun mx-auto" />
                  <p className="font-bold text-xs">Loading Biometric Neural Engine...</p>
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

                  {/* Registered Face Photo Picture-in-Picture thumbnail */}
                  {registeredPhoto && (
                    <div className="absolute top-3 left-3 bg-surface/95 backdrop-blur-sm border-2 border-ink rounded-[10px] p-1.5 shadow-neo-sm flex items-center gap-2 z-10">
                      <img 
                        src={getImageUrl(registeredPhoto)} 
                        alt="Registered scan" 
                        className="w-9 h-9 rounded-[6px] object-cover border border-ink"
                      />
                      <div className="pr-1 text-left">
                        <span className="text-[9px] font-black uppercase text-ink/60 block">Enrolled Face</span>
                        <span className="text-[10px] font-extrabold text-ink block">Profile Photo</span>
                      </div>
                    </div>
                  )}

                  {/* Visual Scanner Laser Beam (Pure CSS - 0 CPU overhead) */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
                    <div className="w-full border-t-2 border-mint/80 shadow-[0_0_12px_#14D9A0] animate-scan-laser absolute" />
                  </div>

                  {/* Viewfinder Target Guide */}
                  <div className="absolute inset-0 pointer-events-none border-4 border-dashed border-white/25 rounded-[12px] m-4 flex items-center justify-center">
                    {!faceDetected && !verifying && (
                      <div className="bg-ink/80 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-[8px] text-xs font-bold border border-white/30 animate-pulse text-center">
                        Align face in viewfinder
                      </div>
                    )}
                  </div>

                  {/* Verifying Spinner Overlay */}
                  {verifying && (
                    <div className="absolute inset-0 bg-ink/70 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 z-20 animate-fade-in">
                      <RefreshCw size={32} className="animate-spin text-sun" />
                      <p className="font-black text-sm text-sun">Verifying Facial Biometrics...</p>
                      <p className="text-xs text-white/80">Comparing with enrolled cryptographic hash</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Status Indicator & Instant Scan Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="text-xs font-bold">
                {verifying ? (
                  <span className="text-violet flex items-center gap-1.5 animate-pulse">
                    <Scan size={16} /> Verifying face biometrics...
                  </span>
                ) : faceDetected ? (
                  <span className="text-mint flex items-center gap-1.5 font-extrabold">
                    <UserCheck size={16} /> Face detected ({detectionScore}%) — Auto-scanning
                  </span>
                ) : (
                  <span className="text-ink/70 flex items-center gap-1.5 font-medium">
                    <Scan size={16} className="text-violet animate-pulse" /> {scanStatusText}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleVerify}
                  disabled={verifying || !modelsLoaded}
                  loading={verifying}
                  className="w-full sm:w-auto shadow-neo-md"
                >
                  <ShieldCheck size={16} className="mr-1.5" /> Scan & Verify Face
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FaceVerificationModal;
