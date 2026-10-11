import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  VideoOff, 
  Lock
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { voterService } from '../../services/voterService';

export const FaceVerificationModal = ({ isOpen, onClose, electionId, onVerified }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [registeredPhoto, setRegisteredPhoto] = useState(null);

  // 1. Fetch voter registered face photo & load AI models
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const init = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        if (isMounted) setModelsLoaded(true);

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
        if (isMounted) setErrorMessage('Could not load biometric models.');
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 2. Start Camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setErrorMessage('');
      setVerificationResult(null);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera error in verification:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser.'
          : 'Unable to start camera. Please verify device camera is available.'
      );
    }
  }, []);

  // 3. Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (isOpen && modelsLoaded && !verificationResult) {
      startCamera();
    } else if (!isOpen) {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, modelsLoaded, verificationResult, startCamera, stopCamera]);

  // 4. Live detection loop
  useEffect(() => {
    if (!cameraActive || verificationResult || !videoRef.current) return;

    const runDetection = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.60 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (detections && detections.length === 1) {
          const singleDetection = detections[0];
          setFaceDetected(true);
          setErrorMessage('');

          if (canvasRef.current && videoRef.current) {
            const displaySize = {
              width: videoRef.current.videoWidth || 640,
              height: videoRef.current.videoHeight || 480
            };
            faceapi.matchDimensions(canvasRef.current, displaySize);
            const resized = faceapi.resizeResults(singleDetection, displaySize);
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, displaySize.width, displaySize.height);

            const box = resized.detection.box;
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#22C55E';
            ctx.strokeRect(box.x, box.y, box.width, box.height);
          }
        } else if (detections && detections.length > 1) {
          setFaceDetected(false);
          setErrorMessage(`Multiple faces detected (${detections.length}). Only 1 voter allowed in the frame!`);
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        } else {
          setFaceDetected(false);
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      } catch (err) {
        // Silently retry next frame
      }
    };

    detectIntervalRef.current = setInterval(runDetection, 180);

    return () => {
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    };
  }, [cameraActive, verificationResult]);

  // 5. Execute Live Biometric Verification
  const handleVerify = async () => {
    if (!videoRef.current || verifying) return;
    setVerifying(true);
    setErrorMessage('');

    try {
      // Re-scan synchronously at moment of verification
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.65 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) {
        setErrorMessage('No human face detected! Please position your face directly in the frame.');
        setVerifying(false);
        return;
      }

      if (detections.length > 1) {
        setErrorMessage(`Multiple faces detected (${detections.length}). Security violation: only the voter is permitted.`);
        setVerifying(false);
        return;
      }

      const singleFace = detections[0];
      if (!singleFace.descriptor || singleFace.descriptor.length !== 128) {
        setErrorMessage('Facial biometric landmarks could not be clearly resolved. Improve lighting.');
        setVerifying(false);
        return;
      }

      const liveDescriptor = Array.from(singleFace.descriptor);

      // Call backend biometric verification API
      const response = await voterService.verifyFace({
        live_descriptor: liveDescriptor,
        election_id: electionId
      });

      if (response.success && response.data?.verified) {
        stopCamera();
        setVerificationResult(response.data);

        // Auto trigger success callback after a brief celebration
        setTimeout(() => {
          onVerified(response.data.ballotToken);
        }, 1200);
      } else {
        setErrorMessage(response.message || 'FACE MISMATCH: Biometric verification failed! Face does not match registered voter profile.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      const msg = err.response?.data?.message || 'Biometric verification failed. Face does not match registered voter profile.';
      setErrorMessage(msg);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !verifying && onClose()}
      title="Biometric Face Verification (Module 3)"
    >
      <div className="space-y-5 text-ink">
        <div className="bg-lavender/60 border-2 border-ink rounded-[12px] p-3.5 text-xs font-semibold flex items-center justify-between shadow-neo-sm">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-violet" />
            <span>Anti-Fraud Biometric Identity Authentication</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-sun border border-ink text-[10px] font-black uppercase">
            Required for ballot
          </span>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-[12px] bg-coral border-2 border-ink text-ink text-xs font-bold shadow-neo-sm flex items-center gap-2 animate-slide-up">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{errorMessage}</span>
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
                Biometric match verified with {verificationResult.confidenceScore}% confidence score.
              </p>
            </div>

            <div className="inline-block px-3 py-1 bg-surface border-2 border-ink rounded-full text-xs font-black shadow-neo-sm">
              Unlocking ballot...
            </div>
          </div>
        ) : cameraError ? (
          /* Camera Error View */
          <div className="p-5 bg-lavender/40 border-2 border-ink rounded-[14px] text-center space-y-3">
            <VideoOff size={32} className="mx-auto text-coral" />
            <h4 className="font-extrabold text-sm">{cameraError}</h4>
            <p className="text-xs font-medium text-ink/70">
              Live webcam access is required to authenticate your biometric identity. Please ensure camera permissions are granted.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Button variant="secondary" size="sm" onClick={startCamera}>
                <RefreshCw size={14} className="mr-1.5" /> Retry Camera
              </Button>
            </div>
          </div>
        ) : (
          /* Live Camera View */
          <div className="space-y-4">
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
                    <div className="absolute top-3 left-3 bg-surface border-2 border-ink rounded-[10px] p-1 shadow-neo-sm flex items-center gap-2 z-10">
                      <img 
                        src={registeredPhoto} 
                        alt="Registered scan" 
                        className="w-10 h-10 rounded-[6px] object-cover border border-ink"
                      />
                      <div className="pr-2 text-left">
                        <span className="text-[9px] font-black uppercase text-ink/60 block">Registered</span>
                        <span className="text-[11px] font-extrabold text-ink block">Profile Face</span>
                      </div>
                    </div>
                  )}

                  {/* Viewfinder Target Overlay */}
                  <div className="absolute inset-0 pointer-events-none border-4 border-dashed border-white/20 rounded-[12px] m-4 flex items-center justify-center">
                    {!faceDetected && (
                      <div className="bg-ink/80 text-white px-3 py-1.5 rounded-[8px] text-xs font-bold border border-white/30 animate-pulse">
                        Center face in viewfinder
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Verification Status & Trigger */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs font-bold">
                {faceDetected ? (
                  <span className="text-mint flex items-center gap-1">
                    <CheckCircle2 size={16} /> Live face detected — Ready to authenticate
                  </span>
                ) : (
                  <span className="text-ink/60 flex items-center gap-1">
                    <AlertTriangle size={15} /> Position face directly at camera
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleVerify}
                  disabled={!faceDetected || verifying || !modelsLoaded}
                  loading={verifying}
                  className="w-full sm:w-auto shadow-neo-md"
                >
                  <ShieldCheck size={16} className="mr-1.5" /> Verify & Unlock Ballot
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
