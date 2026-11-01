/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PixelWindow } from './components/PixelWindow.tsx';
import { SceneDisplay } from './components/SceneDisplay.tsx';
import { HistoryModal } from './components/HistoryModal.tsx';
import { VisualLogModal } from './components/VisualLogModal.tsx';
import { STORY_NODES } from './data/story.ts';
import { TextSpeed } from './types/novel.ts';
import { retroAudio } from './utils/sound.ts';

export default function App() {
  const [nodeIndex, setNodeIndex] = useState<number>(0);
  const [isGlitching, setIsGlitching] = useState<boolean>(false);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [isCrtEnabled, setIsCrtEnabled] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [textSpeed] = useState<TextSpeed>('normal');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isVisualLogOpen, setIsVisualLogOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Screen dimensions for responsive orientation enforcement on mobile devices
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  });

  const glitchTimerRef = useRef<number | null>(null);
  const lastAdvanceTimeRef = useRef<number>(0);

  // Dialogue backlog log
  const [historyLog, setHistoryLog] = useState<
    { speaker: string; text: string; sceneTitle: string; timestamp: string }[]
  >([]);

  const currentNode = STORY_NODES[nodeIndex] || STORY_NODES[0];

  // Window resize & orientation change listener
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Determine if device is a phone in portrait mode (width < height and width <= 850px)
  const isPhonePortrait =
    windowDimensions.width < windowDimensions.height && windowDimensions.width <= 850;

  // The effective horizontal width and height available for the novel
  const effectiveHorizWidth = isPhonePortrait
    ? windowDimensions.height
    : windowDimensions.width;
  const effectiveHorizHeight = isPhonePortrait
    ? windowDimensions.width
    : windowDimensions.height;

  // Try screen orientation lock API on user gesture where supported
  const requestLandscapeLock = useCallback(() => {
    try {
      const orientation = screen.orientation as any;
      if (orientation && typeof orientation.lock === 'function') {
        orientation.lock('landscape').catch(() => {});
      }
    } catch {
      // Ignore if not permitted in iframe
    }
  }, []);

  // Record node to history backlog whenever node changes (only if it has text)
  useEffect(() => {
    if (!currentNode.dialogue || currentNode.dialogue.trim().length === 0) return;

    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setHistoryLog((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.text === currentNode.dialogue) return prev;
      return [
        ...prev,
        {
          speaker: currentNode.speaker,
          text: currentNode.dialogue,
          sceneTitle: currentNode.sceneTitle,
          timestamp: timeStr,
        },
      ];
    });
  }, [nodeIndex, currentNode]);

  // Clean up any glitch timer on unmount
  useEffect(() => {
    return () => {
      if (glitchTimerRef.current) clearTimeout(glitchTimerRef.current);
    };
  }, []);

  // Advance sequence (Next) with debounce to prevent double-skips
  const handleAdvance = useCallback(() => {
    const now = Date.now();
    if (now - lastAdvanceTimeRef.current < 200) return;
    lastAdvanceTimeRef.current = now;

    if (isGlitching) return;

    if (currentNode.choices && currentNode.choices.length > 0) {
      return;
    }

    if (nodeIndex < STORY_NODES.length - 1) {
      setNodeIndex((prev) => prev + 1);
    } else {
      setNodeIndex(0);
    }
  }, [nodeIndex, currentNode, isGlitching]);

  // Go to previous sequence step (Prev)
  const handlePrev = useCallback(() => {
    if (isGlitching) return;
    if (nodeIndex > 0) {
      setNodeIndex((prev) => prev - 1);
    }
  }, [nodeIndex, isGlitching]);

  // Jump directly to specific node from Visual Log
  const handleJumpToNode = useCallback((targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < STORY_NODES.length) {
      setNodeIndex(targetIndex);
    }
  }, []);

  // Choice selection
  const handleSelectChoice = useCallback((targetNodeId: number) => {
    setNodeIndex(targetNodeId);
  }, []);

  // Window controls
  const handleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setNodeIndex(0);
    setIsAutoPlay(false);
    setIsGlitching(false);
  }, []);

  const handleToggleAutoPlay = useCallback(() => {
    setIsAutoPlay((prev) => !prev);
  }, []);

  const handleToggleCrt = useCallback(() => {
    setIsCrtEnabled((prev) => !prev);
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    retroAudio.setMuted(nextMuted);
  }, [isMuted]);

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isHistoryOpen || isVisualLogOpen) {
        if (e.key === 'Escape') {
          setIsHistoryOpen(false);
          setIsVisualLogOpen(false);
        }
        return;
      }

      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleAdvance();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrev();
      } else if (e.key.toLowerCase() === 'v') {
        setIsVisualLogOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'a') {
        handleToggleAutoPlay();
      } else if (e.key.toLowerCase() === 'c') {
        handleToggleCrt();
      } else if (e.key.toLowerCase() === 'm') {
        handleToggleMute();
      } else if (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'h') {
        setIsHistoryOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAdvance, handlePrev, handleToggleAutoPlay, handleToggleCrt, handleToggleMute, isHistoryOpen, isVisualLogOpen]);

  return (
    <div
      onClick={requestLandscapeLock}
      onTouchStart={requestLandscapeLock}
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0A0711] select-none"
    >
      {/* 
        WHEN ON PHONE IN PORTRAIT:
        The entire visual novel is automatically rotated 90 degrees horizontally,
        sized to (height x width), making it impossible to see in portrait mode
        and automatically displaying in full horizontal landscape mode!
      */}
      <div
        className="flex items-center justify-center transition-all duration-300"
        style={
          isPhonePortrait
            ? {
                width: `${windowDimensions.height}px`,
                height: `${windowDimensions.width}px`,
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(90deg)',
                transformOrigin: 'center center',
                maxWidth: `${windowDimensions.height}px`,
                maxHeight: `${windowDimensions.width}px`,
                overflow: 'hidden',
              }
            : {
                width: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem',
              }
        }
      >
        {/* Visual Novel Window: Wraps exactly around the image with 0px space on top & bottom */}
        <PixelWindow
          title="CHRONO_BUTTERFLY.EXE"
          isMinimized={isMinimized}
          onMinimize={handleMinimize}
          onClose={handleClose}
          isAutoPlay={isAutoPlay}
          onToggleAutoPlay={handleToggleAutoPlay}
          isCrtEnabled={isCrtEnabled}
          onToggleCrt={handleToggleCrt}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenVisualLog={() => setIsVisualLogOpen(true)}
          onPrev={handlePrev}
          canPrev={nodeIndex > 0}
          isGlitching={isGlitching}
        >
          <SceneDisplay
            currentNode={currentNode}
            textSpeed={textSpeed}
            isAutoPlay={isAutoPlay}
            onAdvance={handleAdvance}
            onSelectChoice={handleSelectChoice}
            isGlitching={isGlitching}
            isMuted={isMuted}
            availableWidth={effectiveHorizWidth}
            availableHeight={effectiveHorizHeight}
            isPhonePortrait={isPhonePortrait}
          />
        </PixelWindow>

        {/* Visual Scene Navigator Log Modal */}
        <VisualLogModal
          isOpen={isVisualLogOpen}
          onClose={() => setIsVisualLogOpen(false)}
          currentNodeIndex={nodeIndex}
          onJumpToNode={handleJumpToNode}
        />

        {/* Backlog / Transcript Modal */}
        <HistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          entries={historyLog}
        />
      </div>

      {/* Floating indicator when auto-rotated on phone portrait */}
      {isPhonePortrait && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-black/85 border border-[#D8B4FE]/60 px-3 py-1 rounded-full text-[10px] font-pixel text-[#FAF5FF] flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
          <span>🔄</span>
          <span>Landscape Mode Active · Rotate phone horizontally</span>
        </div>
      )}
    </div>
  );
}
