import { useEffect, useRef, useState } from "react";
import { useBrowserCNN } from "./useBrowserCNN";

const ALERT_AUDIO_SRC = "/audio/alert.wav";
const WAKE_AUDIO_SRC = "/audio/hay-tinh-tao.mp3";

export default function useDrowsinessAudio(
    drowsinessActive: boolean,
    events: ReturnType<typeof useBrowserCNN>["events"],
    resetKey: string | null,
  ): boolean {
    const [escalationState, setEscalationState] = useState<{ active: boolean; key: string | null }>({
      active: false,
      key: null,
    });
    const alertAudioRef = useRef<HTMLAudioElement | null>(null);
    const wakeAudioRef = useRef<HTMLAudioElement | null>(null);
    const countedDrowsinessIdsRef = useRef<Set<string>>(new Set());
    const drowsinessAlertCountRef = useRef(0);
    const escalationPendingRef = useRef(false);
    const escalationPlayingRef = useRef(false);
    const escalationTimeoutRef = useRef<number | null>(null);
    const activeResetKeyRef = useRef<string | null>(resetKey);
  
    useEffect(() => {
      if (!alertAudioRef.current) {
        const audio = new Audio(ALERT_AUDIO_SRC);
        audio.loop = true;
        audio.preload = "auto";
        alertAudioRef.current = audio;
      }
      if (!wakeAudioRef.current) {
        const audio = new Audio(WAKE_AUDIO_SRC);
        audio.preload = "auto";
        wakeAudioRef.current = audio;
      }
    }, []);
  
    useEffect(() => {
      const alertAudio = alertAudioRef.current;
      if (!alertAudio) return;
  
      if (drowsinessActive) {
        void alertAudio.play().catch(() => undefined);
        return;
      }
  
      alertAudio.pause();
      alertAudio.currentTime = 0;
    }, [drowsinessActive]);
  
    useEffect(() => {
      if (activeResetKeyRef.current !== resetKey) {
        activeResetKeyRef.current = resetKey;
        countedDrowsinessIdsRef.current = new Set();
        drowsinessAlertCountRef.current = 0;
        escalationPendingRef.current = false;
        escalationPlayingRef.current = false;
      }
  
      for (const event of events) {
        if (event.event_type !== "drowsiness_detected") continue;
        if (countedDrowsinessIdsRef.current.has(event.event_id)) continue;
        countedDrowsinessIdsRef.current.add(event.event_id);
        drowsinessAlertCountRef.current += 1;
        if (drowsinessAlertCountRef.current >= 3) {
          escalationPendingRef.current = true;
        }
      }
  
      if (
        escalationPendingRef.current
        && !drowsinessActive
        && !escalationPlayingRef.current
        && escalationTimeoutRef.current === null
      ) {
        const escalationKey = resetKey;
        escalationTimeoutRef.current = window.setTimeout(() => {
          const wakeAudio = wakeAudioRef.current;
          let playsRemaining = 2;
          escalationTimeoutRef.current = null;
          escalationPlayingRef.current = true;
          setEscalationState({ active: true, key: escalationKey });
  
          const finishEscalation = () => {
            if (wakeAudio) wakeAudio.onended = null;
            drowsinessAlertCountRef.current = 0;
            escalationPendingRef.current = false;
            escalationPlayingRef.current = false;
            setEscalationState({ active: false, key: escalationKey });
          };
  
          const playNext = () => {
            if (!wakeAudio) {
              window.setTimeout(finishEscalation, 3_000);
              return;
            }
            if (playsRemaining <= 0) {
              finishEscalation();
              return;
            }
            playsRemaining -= 1;
            wakeAudio.pause();
            wakeAudio.currentTime = 0;
            wakeAudio.onended = playNext;
            void wakeAudio.play().catch(() => window.setTimeout(playNext, 500));
          };
  
          playNext();
        }, 3_000);
      }
    }, [drowsinessActive, events, resetKey]);
  
    useEffect(() => {
      const alertAudio = alertAudioRef.current;
      const wakeAudio = wakeAudioRef.current;
      if (escalationTimeoutRef.current !== null) {
        window.clearTimeout(escalationTimeoutRef.current);
        escalationTimeoutRef.current = null;
      }
      alertAudio?.pause();
      if (alertAudio) alertAudio.currentTime = 0;
      wakeAudio?.pause();
      if (wakeAudio) wakeAudio.currentTime = 0;
      if (wakeAudio) wakeAudio.onended = null;
      countedDrowsinessIdsRef.current = new Set();
      drowsinessAlertCountRef.current = 0;
      escalationPendingRef.current = false;
      escalationPlayingRef.current = false;
    }, [resetKey]);
  
    useEffect(() => {
      return () => {
        alertAudioRef.current?.pause();
        wakeAudioRef.current?.pause();
        if (wakeAudioRef.current) wakeAudioRef.current.onended = null;
        if (escalationTimeoutRef.current !== null) {
          window.clearTimeout(escalationTimeoutRef.current);
        }
      };
    }, []);
  
    return escalationState.active && escalationState.key === resetKey;
  }