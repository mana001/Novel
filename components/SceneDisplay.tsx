import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StoryNode, TextSpeed } from '../types/novel.ts';
import { DialogueBox } from './DialogueBox.tsx';
import { NOVEL_IMAGES } from '../data/story.ts';
import { retroAudio } from '../utils/sound.ts';

interface SceneDisplayProps {
  currentNode: StoryNode;
  textSpeed: TextSpeed;
  isAutoPlay: boolean;
  onAdvance: () => void;
  onSelectChoice?: (targetNodeId: number) => void;
  isGlitching: boolean;
  isMuted: boolean;
  availableWidth?: number;
  availableHeight?: number;
  isPhonePortrait?: boolean;
}

export const SceneDisplay: React.FC<SceneDisplayProps> = ({
  currentNode,
  textSpeed,
  isAutoPlay,
  onAdvance,
  onSelectChoice,
  isGlitching,
  isMuted,
  availableWidth,
  availableHeight,
  isPhonePortrait = false,
}) => {
  const [activeImage, setActiveImage] = useState(currentNode.sceneImage);
  const [isFlashing, setIsFlashing] = useState(false);
  const [hasCapturedPhoto, setHasCapturedPhoto] = useState(false);
  const [delayedReadyNodeId, setDelayedReadyNodeId] = useState<number | null>(
    !currentNode.textBoxDelaySeconds ? currentNode.id : null
  );
  const [isTextManuallyHidden, setIsTextManuallyHidden] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previousSceneIdRef = useRef<string | null>(null);

  // Reset manual text hide on scene navigation
  useEffect(() => {
    setIsTextManuallyHidden(false);
  }, [currentNode.id]);

  useEffect(() => {
    if (!isGlitching) {
      setActiveImage(currentNode.sceneImage);
    }
  }, [currentNode.sceneImage, isGlitching]);

  // Sync mute state
  useEffect(() => {
    retroAudio.setMuted(isMuted);
  }, [isMuted]);

  // Handle delay before displaying text box (guaranteed no flash)
  useEffect(() => {
    if (currentNode.textBoxDelaySeconds && currentNode.textBoxDelaySeconds > 0) {
      setDelayedReadyNodeId(null);
      const timer = window.setTimeout(() => {
        setDelayedReadyNodeId(currentNode.id);
      }, currentNode.textBoxDelaySeconds * 1000);
      return () => clearTimeout(timer);
    } else {
      setDelayedReadyNodeId(currentNode.id);
    }
  }, [currentNode.id, currentNode.textBoxDelaySeconds]);

  const isDelayedTextReady =
    !currentNode.textBoxDelaySeconds || delayedReadyNodeId === currentNode.id;

  // Cafe music: plays for Visual 1 and Visual 2
  useEffect(() => {
    const isCafeScene =
      currentNode.sceneId === 'scene-1' || currentNode.sceneId === 'scene-2';

    if (isCafeScene) {
      retroAudio.startCafeMusic();
    } else {
      retroAudio.stopCafeMusic();
    }
  }, [currentNode.sceneId]);

  // Sneaky Adventure music: plays during Visual 6 and Visual 7 (+40% volume: 0.35)
  useEffect(() => {
    const isVisual6Or7 =
      currentNode.sceneId === 'scene-6' ||
      currentNode.sceneId === 'scene-7' ||
      currentNode.sceneTitle === 'VISUAL 6' ||
      currentNode.sceneTitle === 'VISUAL 7';

    if (isVisual6Or7) {
      retroAudio.startSneakyAdventureMusic(0.91);
    } else {
      retroAudio.stopSneakyAdventureMusic();
    }
  }, [currentNode.id, currentNode.sceneId, currentNode.sceneTitle]);

  // Sneaky Snitch music: Starts at 00:01 of Visual 9, continues through Visual 99, stops at Break 1 (+30% volume: 0.91)
  useEffect(() => {
    const isVisual9Or99 =
      currentNode.sceneId === 'scene-9' ||
      currentNode.sceneId === 'scene-9-1' ||
      currentNode.sceneId === 'scene-99' ||
      currentNode.sceneTitle === 'VISUAL 9' ||
      currentNode.sceneTitle === 'VISUAL 9.1' ||
      currentNode.sceneTitle === 'VISUAL 99';

    if (!isVisual9Or99) {
      retroAudio.stopSneakySnitchMusic();
      return;
    }

    let timer: number | null = null;
    if (currentNode.sceneId === 'scene-9' && currentNode.textBoxDelaySeconds) {
      timer = window.setTimeout(() => {
        retroAudio.stopStarostinMusic();
        retroAudio.startSneakySnitchMusic(0.91);
      }, (currentNode.textBoxDelaySeconds || 1.0) * 1000);
    } else {
      retroAudio.stopStarostinMusic();
      retroAudio.startSneakySnitchMusic(0.91);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [currentNode.id, currentNode.sceneId, currentNode.sceneTitle, currentNode.textBoxDelaySeconds]);

  // Cricket MP3 management for Visual 13 (+40% volume: 0.70, stops Starostin)
  useEffect(() => {
    const isVisual13 =
      currentNode.sceneId === 'scene-13' || currentNode.sceneTitle === 'VISUAL 13';

    if (isVisual13) {
      retroAudio.stopStarostinMusic();
      retroAudio.playCricketMusic(0.70);
    } else {
      retroAudio.stopCricketMusic();
    }
  }, [currentNode.id, currentNode.sceneId, currentNode.sceneTitle]);

  // Starostin BGM management across scenes:
  // - Starts at intro.mp4, plays at 30% through intro1 and intro2
  // - Lowers to 4% volume after intro2 (visual 3 through 55)
  // - MUST STOP at glitch.mp4 (scene-glitch)
  // - MUST STOP at Visual 6 and Visual 7 [Sneaky Adventure plays]
  // - RE-CONTINUES at Visual 8 at 4%
  // - MUST STOP at Visual 9 and Visual 99 [Sneaky Snitch plays]
  // - MUST STOP at break1 (INTERMISSION)
  // - RE-CONTINUES after break1 (visual 10, 11, 12) at 4%
  // - MUST STOP at Visual 13 (cricket mp3 plays) and Visual 14 (deadpan silence)
  // - RE-CONTINUES at Visual 15 and Visual 16 (Whitee interview) at 4%
  // - MUST STOP at break2 and break22 (Intermission 2 & Finale)
  // - Stops completely if returning to Visual 1 or 2 (cafe music)
  useEffect(() => {
    const isGlitchScene =
      currentNode.sceneId.includes('glitch') || currentNode.sceneTitle === 'ANOMALY DETECTED';

    const isVisual6Or7 =
      currentNode.sceneId === 'scene-6' ||
      currentNode.sceneId === 'scene-7' ||
      currentNode.sceneTitle === 'VISUAL 6' ||
      currentNode.sceneTitle === 'VISUAL 7';

    const isVisual9Or99 =
      currentNode.sceneId === 'scene-9' ||
      currentNode.sceneId === 'scene-9-1' ||
      currentNode.sceneId === 'scene-99' ||
      currentNode.sceneTitle === 'VISUAL 9' ||
      currentNode.sceneTitle === 'VISUAL 9.1' ||
      currentNode.sceneTitle === 'VISUAL 99';

    const isBreak =
      currentNode.sceneId.startsWith('scene-break') ||
      currentNode.sceneId === 'scene-15-2' ||
      currentNode.sceneTitle.includes('INTERMISSION') ||
      currentNode.sceneTitle.includes('FINALE');

    const isVisual13Or14 =
      currentNode.sceneId === 'scene-13' ||
      currentNode.sceneId === 'scene-14' ||
      currentNode.sceneTitle === 'VISUAL 13' ||
      currentNode.sceneTitle === 'VISUAL 14';

    const isCafeScene =
      currentNode.sceneId === 'scene-1' || currentNode.sceneId === 'scene-2';

    const isIntroScene =
      currentNode.sceneId === 'scene-intro' ||
      currentNode.sceneId === 'scene-intro1' ||
      currentNode.sceneId === 'scene-intro2';

    const isCameraScene =
      currentNode.sceneId.includes('camera') || currentNode.sceneImage.includes('camera.mp4');

    if (isCafeScene) {
      retroAudio.stopStarostinMusic();
    } else if (isIntroScene) {
      retroAudio.playStarostinMusic(0.3);
    } else if (isGlitchScene || isCameraScene || isVisual6Or7 || isVisual9Or99 || isBreak || isVisual13Or14) {
      retroAudio.stopStarostinMusic();
    } else {
      // Plays at 4% volume (visual 3..55, visual 8, visual 10..12, visual 15..27)
      retroAudio.playStarostinMusic(0.04);
    }
  }, [currentNode.id, currentNode.sceneId, currentNode.sceneTitle]);

  // Cleanup all audio on unmount
  useEffect(() => {
    return () => {
      retroAudio.stopCafeMusic();
      retroAudio.stopStarostinMusic();
      retroAudio.stopSneakyAdventureMusic();
      retroAudio.stopSneakySnitchMusic();
      retroAudio.stopCricketMusic();
    };
  }, []);

  // Reset photo capture state if navigating away from photo mode
  useEffect(() => {
    if (!currentNode.isPhotoMode) {
      setHasCapturedPhoto(false);
      setIsFlashing(false);
    }
  }, [currentNode.isPhotoMode]);

  // Video playback handling: plays once cleanly when entering a video scene
  useEffect(() => {
    const isNewScene = previousSceneIdRef.current !== currentNode.sceneId;
    previousSceneIdRef.current = currentNode.sceneId;

    if (isNewScene && currentNode.isVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    // Explicit safeguard: If entering quiet scenes, glitches or breaks, force Starostin to stop immediately
    const isMutedMusicScene =
      currentNode.sceneId.includes('glitch') ||
      currentNode.sceneId.includes('camera') ||
      currentNode.sceneId.startsWith('scene-break') ||
      currentNode.sceneId === 'scene-15-2' ||
      currentNode.sceneTitle === 'ANOMALY DETECTED' ||
      currentNode.sceneTitle.includes('INTERMISSION') ||
      currentNode.sceneTitle.includes('FINALE') ||
      currentNode.sceneId === 'scene-6' ||
      currentNode.sceneId === 'scene-7' ||
      currentNode.sceneTitle === 'VISUAL 6' ||
      currentNode.sceneTitle === 'VISUAL 7' ||
      currentNode.sceneId === 'scene-9' ||
      currentNode.sceneId === 'scene-9-1' ||
      currentNode.sceneId === 'scene-99' ||
      currentNode.sceneId === 'scene-13' ||
      currentNode.sceneId === 'scene-14' ||
      currentNode.sceneTitle === 'VISUAL 9.1' ||
      currentNode.sceneTitle === 'VISUAL 13' ||
      currentNode.sceneTitle === 'VISUAL 14';

    if (isMutedMusicScene) {
      retroAudio.stopStarostinMusic();
    }
  }, [currentNode.id, currentNode.sceneId, currentNode.isVideo, currentNode.sceneTitle]);

  // Monitor video playback time to trigger delayed text box and timed audio triggers
  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const time = e.currentTarget.currentTime;
    if (currentNode.textBoxDelaySeconds && time >= currentNode.textBoxDelaySeconds) {
      setDelayedReadyNodeId(currentNode.id);
    }

    // Precise video-time sync: Start playing Sneaky Snitch at 00:01 of Visual 9 (currentTime >= 1.0)
    if (
      (currentNode.sceneId === 'scene-9' || currentNode.sceneTitle === 'VISUAL 9') &&
      time >= 1.0
    ) {
      retroAudio.stopStarostinMusic();
      retroAudio.startSneakySnitchMusic(0.91);
    }
  };

  // Take Picture of the Group (uses user-provided irinairinafomicheva-camera-13695.mp3)
  const handleTakePhoto = useCallback(() => {
    retroAudio.duckCafeMusicForPhoto();
    retroAudio.playCameraShutter();
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
      setHasCapturedPhoto(true);
    }, 350);
  }, []);

  // Download the captured group photo
  const handleDownloadPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = NOVEL_IMAGES.novel2;
    link.download = 'chrono_butterfly_group_photo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // General click handler on the viewport
  const handleViewportClick = () => {
    if (isGlitching) return;

    if (isTextManuallyHidden) {
      setIsTextManuallyHidden(false);
      return;
    }

    if (currentNode.isPhotoMode) {
      if (!hasCapturedPhoto) {
        handleTakePhoto();
      } else {
        onAdvance();
      }
      return;
    }

    onAdvance();
  };

  // Check scene native aspect ratio so container and media fit edge-to-edge naturally:
  // - 16:9 widescreen scenes: Break 3, Break 4, Break 5, Break 2, Glitch (~1.778)
  // - Square-ish scenes: Break 1, Break 22 (~1.05)
  // - Wide prologue scenes: Intro, Intro1, Intro2, Visual 1 (~1.48)
  // - Standard visual interview scenes: Visual 2 to 27, 44, 5-1, 55, 99 (~1.30 / 1404x1080)
  const is16x9Scene =
    currentNode.sceneId.includes('breakk') ||
    currentNode.sceneId.includes('break3') ||
    currentNode.sceneId.includes('break4') ||
    currentNode.sceneId.includes('break5') ||
    currentNode.sceneId.includes('break6') ||
    currentNode.sceneId.includes('break7') ||
    currentNode.sceneId.includes('break8') ||
    currentNode.sceneId.includes('camera') ||
    currentNode.sceneId === 'scene-break2' ||
    currentNode.sceneId.includes('glitch') ||
    currentNode.sceneImage.includes('breakk') ||
    currentNode.sceneImage.includes('break3') ||
    currentNode.sceneImage.includes('break4') ||
    currentNode.sceneImage.includes('break5') ||
    currentNode.sceneImage.includes('break6') ||
    currentNode.sceneImage.includes('break7') ||
    currentNode.sceneImage.includes('break8') ||
    currentNode.sceneImage.includes('camera.mp4') ||
    currentNode.sceneImage.includes('break2.mp4') ||
    currentNode.sceneImage.includes('glitch.mp4');

  const isSquareScene =
    currentNode.sceneId === 'scene-break1' ||
    currentNode.sceneId === 'scene-break22' ||
    currentNode.sceneImage.includes('break1.mp4') ||
    currentNode.sceneImage.includes('break22.mp4');

  const isWideIntro =
    currentNode.sceneId === 'scene-intro' ||
    currentNode.sceneId === 'scene-intro1' ||
    currentNode.sceneId === 'scene-intro2' ||
    currentNode.sceneId === 'scene-1';

  const isVisual31or32 =
    currentNode.sceneId === 'scene-31' ||
    currentNode.sceneId === 'scene-32' ||
    currentNode.sceneId === 'scene-32-1' ||
    currentNode.sceneImage.includes('visual31') ||
    currentNode.sceneImage.includes('visual32');

  let targetAspect = 1404 / 1080; // Standard ~1.30:1 (4:3) for visual novel interviews & drawings
  if (is16x9Scene) {
    targetAspect = 16 / 9; // 1.778 widescreen
  } else if (isSquareScene) {
    targetAspect = 1.05;
  } else if (isWideIntro) {
    targetAspect = 1.48;
  } else if (isVisual31or32) {
    targetAspect = 1482 / 1061;
  }

  // Header height in PixelWindow is ~34px, with window borders and margins ~8-12px
  const headerAllowance = isPhonePortrait ? 36 : 42;
  const paddingAllowance = isPhonePortrait ? 4 : 12;

  const currentAvailableW =
    availableWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const currentAvailableH =
    availableHeight || (typeof window !== 'undefined' ? window.innerHeight : 720);

  const maxW = Math.max(320, currentAvailableW - paddingAllowance);
  const maxH = Math.max(200, currentAvailableH - headerAllowance);

  let displayH = maxH;
  let displayW = Math.round(displayH * targetAspect);

  if (displayW > maxW) {
    displayW = maxW;
    displayH = Math.round(displayW / targetAspect);
  }

  return (
    <div
      onClick={handleViewportClick}
      style={{
        width: `${displayW}px`,
        height: `${displayH}px`,
        aspectRatio: `${targetAspect}`,
        maxWidth: '100%',
        maxHeight: '100%',
      }}
      className={`relative max-w-full max-h-full overflow-hidden select-none ${
        isGlitching ? 'cursor-wait' : 'cursor-pointer'
      } flex flex-col justify-end ${isVisual31or32 ? 'bg-[#f0f2f5]' : 'bg-black'} shadow-inner`}
      role="button"
      tabIndex={0}
      aria-label={
        currentNode.isPhotoMode
          ? hasCapturedPhoto
            ? 'Group Photo Captured - Click to continue'
            : 'Camera Viewfinder - Click to take picture'
          : 'Scene Viewport - Click to advance'
      }
    >
      {/* BASE MEDIA (IMAGE OR VIDEO) */}
      {/* STRICTLY use object-contain bg-black so that 100% of full pics and videos show without being cut */}
      {currentNode.isVideo ? (
        <video
          key={currentNode.sceneImage}
          ref={videoRef}
          src={currentNode.sceneImage}
          preload="auto"
          playsInline
          muted={isMuted}
          onCanPlay={(e) => {
            if (e.currentTarget.currentTime === 0) {
              e.currentTarget.play().catch(() => {});
            }
          }}
          onTimeUpdate={handleVideoTimeUpdate}
          onEnded={(e) => {
            e.currentTarget.pause();
            if (currentNode.autoAdvanceOnEnded) {
              onAdvance();
            }
          }}
          className="absolute inset-0 w-full h-full object-contain bg-black select-none"
        />
      ) : (
        <img
          key={currentNode.sceneImage}
          src={isGlitching ? NOVEL_IMAGES.novel1 : activeImage}
          alt={currentNode.sceneTitle}
          className={`absolute inset-0 w-full h-full select-none ${
            isVisual31or32 ? 'object-cover' : 'object-contain bg-black'
          }`}
        />
      )}

      {/* 3. GLITCH EFFECT AT THE END OF VISUAL 5 */}
      {isGlitching && (
        <div className="absolute inset-0 z-15 pointer-events-none overflow-hidden">
          <video
            src={NOVEL_IMAGES.novel5}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover glitch-layer-1 opacity-95 mix-blend-screen"
          />

          <div className="absolute inset-0 bg-[#3B1D40]/70 mix-blend-color-dodge glitch-layer-2 opacity-90" />

          <div className="absolute inset-0 flex flex-col justify-between py-4 opacity-85">
            <div className="h-4 w-full bg-[#FBCFE8]/70 transform translate-x-6 shadow-[0_0_12px_#FBCFE8]" />
            <div className="h-8 w-full bg-[#A7F3D0]/70 transform -translate-x-8 shadow-[0_0_12px_#A7F3D0]" />
            <div className="h-3 w-full bg-[#BAE6FD]/80 transform translate-x-10 shadow-[0_0_12px_#BAE6FD]" />
            <div className="h-6 w-full bg-[#D8B4FE]/80 transform -translate-x-5 shadow-[0_0_12px_#D8B4FE]" />
            <div className="h-5 w-full bg-[#FDE68A]/75 transform translate-x-4 shadow-[0_0_12px_#FDE68A]" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-4 py-1.5 bg-[#2B1B3C]/95 border-2 border-[#824B85] text-[#FAF5FF] font-silkscreen text-xs font-bold tracking-widest uppercase animate-pulse shadow-[0_0_20px_#824B85]">
              [CHRONAL GLITCH IN PROGRESS · TIMELINE CORRUPTION]
            </div>
          </div>

          <div className="absolute inset-0 bg-[#FAF5FF] glitch-flash-overlay pointer-events-none" />
        </div>
      )}

      {/* 4. AMBIENT PARTICLES OVER THE IMAGE (when not in photo mode and not video) */}
      {!isGlitching && !currentNode.isPhotoMode && !currentNode.isVideo && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/5 w-2 h-2 rounded-full bg-[#FBCFE8]/40 blur-[1px] animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 rounded-full bg-[#A7F3D0]/40 blur-[1px] animate-ping" />
          <div className="absolute top-1/2 left-2/3 w-2 h-2 rounded-full bg-[#D8B4FE]/50 blur-[2px] animate-pulse" />
          <div className="absolute top-3/4 left-1/3 w-1.5 h-1.5 rounded-full bg-[#BAE6FD]/40 blur-[1px] animate-ping" />
        </div>
      )}

      {/* 5. PHOTO MODE: CONTINUES IN THE SAME WINDOW */}
      {currentNode.isPhotoMode && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 pointer-events-none">
          <div className="flex justify-between items-start">
            <div className="bg-[#2B1B3C]/90 border-2 border-[#824B85] px-3 py-1.5 pixel-corners-sm shadow-md">
              <span className="font-silkscreen text-xs font-bold tracking-wider text-[#FAF5FF] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] animate-ping" />
                {hasCapturedPhoto ? 'PHOTO PREVIEW · STORED' : 'REC [00:00:02]'}
              </span>
            </div>

            <div className="bg-[#2B1B3C]/90 border-2 border-[#824B85] px-3 py-1.5 pixel-corners-sm shadow-md">
              <span className="font-pixel text-xs text-[#FAF5FF]">
                {hasCapturedPhoto ? 'STATUS: SAVED' : 'ISO 400 · AF-LOCK'}
              </span>
            </div>
          </div>

          {/* Stepped pixel camera viewfinder brackets */}
          <div className="relative flex-1 my-3 sm:my-4 flex items-center justify-center">
            <div className="w-4/5 h-4/5 relative border-2 border-dashed border-[#FBCFE8]/60 pixel-corners-box">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#824B85]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#824B85]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#824B85]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#824B85]" />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-5 h-5 border border-[#824B85]/60 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-[#824B85]/80" />
                </div>
              </div>

              {!hasCapturedPhoto && (
                <div className="absolute bottom-3 inset-x-0 flex justify-center">
                  <span className="font-silkscreen text-[11px] sm:text-xs text-[#FAF5FF] bg-[#2B1B3C]/80 px-3 py-1 pixel-corners-sm border border-[#824B85] animate-pulse">
                    CLICK SCREEN OR PRESS SPACE TO CAPTURE
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Controls After Photo Capture */}
          {hasCapturedPhoto && (
            <div className="flex flex-col items-center justify-center gap-2 pb-2 pointer-events-auto z-30">
              <div className="flex items-center gap-2 sm:gap-3 bg-[#26132C]/90 border-2 border-[#824B85] p-1.5 sm:p-2 pixel-corners-box shadow-[0_8px_25px_rgba(0,0,0,0.8)] backdrop-blur-xs">
                <button
                  onClick={handleDownloadPhoto}
                  className="px-3 py-1.5 bg-[#4F2054] hover:bg-[#3E1843] text-[#FAF5FF] font-silkscreen font-bold text-xs flex items-center gap-1.5 pixel-corners-sm transition-colors cursor-pointer"
                  title="Download group photo"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 12l-5-5h3V1h4v6h3l-5 5zM1 14h14v2H1v-2z" />
                  </svg>
                  <span>DOWNLOAD PIC</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvance();
                  }}
                  className="px-5 py-1.5 bg-gradient-to-r from-[#D8B4FE] to-[#FBCFE8] hover:from-[#C084FC] hover:to-[#F472B6] text-[#2E1230] font-silkscreen font-bold text-xs flex items-center gap-2 pixel-corners-sm shadow-md transition-all transform active:scale-95 cursor-pointer"
                >
                  <span>NEXT</span>
                  <svg className="w-3.5 h-3.5 text-[#2E1230]" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 2v12l8-6-8-6z" />
                  </svg>
                </button>
              </div>

              <span className="text-[11px] font-pixel text-[#FAF5FF] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-black/60 px-2.5 py-0.5 pixel-corners-sm">
                Click NEXT, press SPACE, or click anywhere to continue
              </span>
            </div>
          )}
        </div>
      )}

      {/* Camera Shutter Flash Effect */}
      {isFlashing && (
        <div className="absolute inset-0 bg-white camera-flash-overlay pointer-events-none z-50" />
      )}

      {/* 6. TEXT BOX (Hidden if no text, explicitly hidden, or manually hidden by user to view artwork) */}
      {!isTextManuallyHidden &&
        !currentNode.hideTextBox &&
        isDelayedTextReady &&
        (isGlitching ||
          (currentNode.dialogue && currentNode.dialogue.trim().length > 0) ||
          (currentNode.choices && currentNode.choices.length > 0)) && (
        <div className="absolute bottom-0 inset-x-0 z-20 w-full flex justify-center p-2 sm:p-3 pointer-events-none transition-all duration-500 transform translate-y-0 opacity-100">
          <div className="w-full pointer-events-auto animate-fade-in">
            <DialogueBox
              key={`dialogue-${currentNode.id}`}
              speaker={isGlitching ? 'SYSTEM GLITCH' : currentNode.speaker}
              portraitSrc={currentNode.portraitImage}
              text={
                isGlitching
                  ? '*** CRITICAL TEMPORAL ANOMALY: TRANSMISSION SEVERED ***'
                  : currentNode.dialogue
              }
              speed={isGlitching ? 'instant' : textSpeed}
              isAutoPlay={isAutoPlay}
              onAdvance={onAdvance}
              choices={isGlitching ? undefined : currentNode.choices}
              onSelectChoice={onSelectChoice}
              onToggleHide={() => setIsTextManuallyHidden(true)}
            />
          </div>
        </div>
      )}

      {/* Floating button when text is manually hidden so user can easily restore it */}
      {isTextManuallyHidden && !currentNode.hideTextBox && (
        <div className="absolute top-3 right-3 z-30 pointer-events-auto animate-fade-in">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsTextManuallyHidden(false);
            }}
            className="px-2.5 py-1 bg-[#2B1B3C]/90 hover:bg-[#3E1843] border border-[#824B85] text-[#FAF5FF] font-pixel text-xs rounded-xs shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
            title="Restore dialogue box (or click screen)"
          >
            <svg className="w-3.5 h-3.5 text-[#FBCFE8]" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3c-4.4 0-8 5-8 5s3.6 5 8 5 8-5 8-5-3.6-5-8-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm0-5.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
            <span>SHOW TEXT</span>
          </button>
        </div>
      )}
    </div>
  );
};
