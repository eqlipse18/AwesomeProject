// useFaceCheck.js
// Place: src/hooks/useFaceCheck.js

import { useState, useCallback } from 'react';
import FaceDetection from '@react-native-ml-kit/face-detection';
import { FACE_RESULT } from '../components/registration/FaceCheckSheet';

// ── Thresholds ────────────────────────────────────────────────────────────────
const MIN_EYE_OPEN_PROB = 0.4; // below this = eyes closed
const MIN_FACE_SIZE_RATIO = 0.08; // face must be at least 8% of image area

export const useFaceCheck = () => {
  const [checking, setChecking] = useState(false);
  const [sheetState, setSheetState] = useState({
    visible: false,
    result: null,
    imageUri: null,
    pendingIndex: null,
    onPass: null,
    allowSkip: true,
  });

  const closeSheet = useCallback(() => {
    setSheetState(p => ({ ...p, visible: false }));
  }, []);

  const checkFace = useCallback(async localPath => {
    setChecking(true);
    try {
      const faces = await FaceDetection.detect(localPath, {
        performanceMode: 'fast',
        classificationMode: 'none',
        contourMode: 'none',
        landmarkMode: 'none',
        minFaceSize: 0.02, // bahut loose — almost sab pass
      });

      // Sirf ek check — koi face hai ya nahi
      if (!faces || faces.length === 0) {
        return { pass: false, result: FACE_RESULT.NO_FACE };
      }

      return { pass: true };
    } catch (err) {
      console.warn('[FaceCheck] error:', err?.message);
      return { pass: true }; // error pe pass
    } finally {
      setChecking(false);
    }
  }, []);

  const validateAndSet = useCallback(
    async ({ localPath, index, onPass, allowSkip = true }) => {
      const { pass, result } = await checkFace(localPath);

      if (pass) {
        onPass();
        return;
      }

      setSheetState({
        visible: true,
        result,
        imageUri: localPath,
        pendingIndex: index,
        // allowSkip,
        onPass,
      });
    },
    [checkFace],
  );

  return { checking, sheetState, closeSheet, validateAndSet };
};
