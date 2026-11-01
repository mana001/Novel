import React, { useEffect, useState, useRef } from 'react';
import { TextSpeed } from '../types/novel.ts';

interface DialogueBoxProps {
  speaker: string;
  portraitSrc: string;
  text: string;
  speed: TextSpeed;
  isAutoPlay: boolean;
  onAdvance: () => void;
  choices?: {
    text: string;
    targetNodeId: number;
  }[];
  onSelectChoice?: (targetNodeId: number) => void;
  onToggleHide?: () => void;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  speaker,
  portraitSrc,
  text,
  speed,
  isAutoPlay,
  onAdvance,
  choices,
  onSelectChoice,
  onToggleHide,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const typingTimerRef = useRef<number | null>(null);
  const autoPlayTimerRef = useRef<number | null>(null);

  if (!text || text.trim() === '') {
    return null;
  }

  // Speed delay in ms per character
  const getCharDelay = () => {
    switch (speed) {
      case 'slow':
        return 45;
      case 'fast':
        return 12;
      case 'instant':
        return 0;
      case 'normal':
      default:
        return 22;
    }
  };

  // Typewriter effect setup
  useEffect(() => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);

    if (speed === 'instant') {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);
    let currentIndex = 0;
    const delay = getCharDelay();

    typingTimerRef.current = window.setInterval(() => {
      currentIndex++;
      if (currentIndex <= text.length) {
        setDisplayedText(text.slice(0, currentIndex));
      } else {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setIsTyping(false);
      }
    }, delay);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [text, speed]);

  // Auto-play progression once text has completed typing
  useEffect(() => {
    if (!isTyping && isAutoPlay && (!choices || choices.length === 0)) {
      autoPlayTimerRef.current = window.setTimeout(() => {
        onAdvance();
      }, 2400);
    }
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [isTyping, isAutoPlay, choices, onAdvance]);

  // Click handler on dialogue box
  const handleBoxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTyping) {
      // Fast forward text instantly
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setDisplayedText(text);
      setIsTyping(false);
    } else {
      if (choices && choices.length > 0) return;
      onAdvance();
    }
  };

  // Render markdown formatting (**bold** and *italic*) cleanly during typing
  const renderFormattedText = (raw: string) => {
    const elements: React.ReactNode[] = [];
    const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        elements.push(raw.slice(lastIndex, match.index));
      }
      if (match[1] !== undefined) {
        elements.push(
          <strong key={match.index} className="font-extrabold text-[#3B1D40] tracking-wide">
            {match[1]}
          </strong>
        );
      } else if (match[2] !== undefined) {
        elements.push(
          <span key={match.index} className="italic font-bold text-[#592660]">
            {match[2]}
          </span>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < raw.length) {
      const remainder = raw.slice(lastIndex);
      if (remainder.startsWith('**')) {
        elements.push(
          <strong key="incomplete-bold" className="font-extrabold text-[#3B1D40] tracking-wide">
            {remainder.slice(2)}
          </strong>
        );
      } else if (remainder.startsWith('*')) {
        elements.push(
          <span key="incomplete-italic" className="italic font-bold text-[#592660]">
            {remainder.slice(1)}
          </span>
        );
      } else {
        elements.push(remainder);
      }
    }

    return elements.length > 0 ? elements : raw;
  };

  return (
    <div
      onClick={handleBoxClick}
      className="relative w-full max-w-4xl lg:max-w-5xl mx-auto px-2 sm:px-3 pb-1 sm:pb-2 pointer-events-auto cursor-pointer select-none filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]"
      role="region"
      aria-label="Dialogue Window"
    >
      {/* 
        PIXEL-ART BEIGE TEXT BOX (#EAE0C8) WITH STEPPED PIXEL CORNERS
        - Stepped pixel polygon cut corners (pixel-corners-box)
        - Comfortable vertical padding (py-3 sm:py-3.5 px-4 sm:px-6)
        - Purple inner border (#824B85) inset-[3.5px] sm:inset-[5px] with pixel corners
        - High-contrast text #2E1230 on beige surface with authentic PIXEL FONT
      */}
      <div className="relative bg-[#EAE0C8] py-3 sm:py-3.5 px-4 sm:px-6 text-[#2E1230] pixel-corners-box">
        
        {/* PURPLE INNER LINE (#824B85) SET BACK inset-[3.5px] sm:inset-[5px] WITH STEPPED PIXEL CORNERS */}
        <div className="absolute inset-[3.5px] sm:inset-[5px] border-2 border-[#824B85] pixel-corners-sm pointer-events-none z-10" />

        {/* 4 RETRO STEPPED PIXEL CORNER BRACKET ACCENTS IN PURPLE (#824B85) */}
        {/* Top-Left Corner Notch */}
        <div className="absolute top-2 left-2 pointer-events-none z-20">
          <svg className="w-3.5 h-3.5 text-[#824B85]" viewBox="0 0 7 7" fill="currentColor">
            <rect x="0" y="0" width="7" height="2" />
            <rect x="0" y="2" width="2" height="5" />
            <rect x="2" y="2" width="2" height="2" />
          </svg>
        </div>
        {/* Top-Right Corner Notch */}
        <div className="absolute top-2 right-2 pointer-events-none z-20">
          <svg className="w-3.5 h-3.5 text-[#824B85]" viewBox="0 0 7 7" fill="currentColor">
            <rect x="0" y="0" width="7" height="2" />
            <rect x="5" y="2" width="2" height="5" />
            <rect x="3" y="2" width="2" height="2" />
          </svg>
        </div>
        {/* Bottom-Left Corner Notch */}
        <div className="absolute bottom-2 left-2 pointer-events-none z-20">
          <svg className="w-3.5 h-3.5 text-[#824B85]" viewBox="0 0 7 7" fill="currentColor">
            <rect x="0" y="5" width="7" height="2" />
            <rect x="0" y="0" width="2" height="5" />
            <rect x="2" y="3" width="2" height="2" />
          </svg>
        </div>
        {/* Bottom-Right Corner Notch */}
        <div className="absolute bottom-2 right-2 pointer-events-none z-20">
          <svg className="w-3.5 h-3.5 text-[#824B85]" viewBox="0 0 7 7" fill="currentColor">
            <rect x="0" y="5" width="7" height="2" />
            <rect x="5" y="0" width="2" height="5" />
            <rect x="3" y="3" width="2" height="2" />
          </svg>
        </div>

        <div className="relative z-20 flex items-start sm:items-center gap-3 sm:gap-5">
          
          {/* CHARACTER PORTRAIT FRAME WITH STEPPED PIXEL CORNERS (UPLOADED BUTTERFLY PORTRAIT OR CHARACTER AVATAR) */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 overflow-hidden bg-[#3B1D40] p-0.5 pixel-corners-sm shadow-md">
            <div className="absolute inset-0 border-2 border-[#824B85] pixel-corners-sm pointer-events-none z-10" />
            {portraitSrc ? (
              <img
                src={portraitSrc}
                alt={speaker}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#4C1D54] to-[#251329] flex flex-col items-center justify-center text-[#FBCFE8]">
                <span className="font-silkscreen font-bold text-base sm:text-lg tracking-widest text-[#FBCFE8]">
                  {speaker.trim().includes(' ')
                    ? speaker
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)
                    : speaker.slice(0, 2).toUpperCase() || '?'}
                </span>
                <span className="font-pixel text-[9px] text-[#D8B4FE]/80 uppercase mt-0.5">
                  ARTIST
                </span>
              </div>
            )}
            {/* Pixel corners on the portrait */}
            <div className="absolute top-0 left-0 w-2 h-2 bg-[#824B85] pointer-events-none z-20" />
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#824B85] pointer-events-none z-20" />
          </div>

          {/* DIALOGUE CONTENT AREA WITH AUTHENTIC PIXEL FONT */}
          <div className="flex-1 flex flex-col justify-center min-w-0">
            {/* Header: Pixel Character Name Badge + Status */}
            <div className="flex items-center justify-between mb-1.5 border-b-2 border-dashed border-[#824B85]/30 pb-1">
              <div className="flex items-center gap-2">
                {/* Stepped Pixel Character Name Badge */}
                <div className="flex items-center">
                  <span className="px-2.5 py-0.5 bg-[#824B85] text-[#FAF5FF] font-silkscreen text-[11px] sm:text-xs font-bold tracking-widest uppercase pixel-corners-sm shadow-sm">
                    {speaker}
                  </span>
                </div>
                <span className="hidden sm:inline-block text-xs text-[#824B85] font-pixel font-bold tracking-wide">
                  [VOICE LINK ACTIVE]
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-pixel">
                {isTyping ? (
                  <span className="text-[#824B85] flex items-center gap-1 font-bold">
                    <span className="w-2 h-2 bg-[#824B85] animate-ping" />
                    SPEAKING...
                  </span>
                ) : (
                  <span className="text-[#592660] font-bold">[READY]</span>
                )}

                {onToggleHide && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHide();
                    }}
                    className="px-1.5 py-0.5 bg-[#824B85]/15 hover:bg-[#824B85]/30 text-[#592660] font-pixel text-[10px] rounded-xs cursor-pointer flex items-center gap-1 transition-colors border border-[#824B85]/30"
                    title="Hide dialogue box to view full picture"
                  >
                    <svg className="w-3 h-3 text-[#592660]" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 3c-4.4 0-8 5-8 5s3.6 5 8 5 8-5 8-5-3.6-5-8-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm0-5.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                    <span>HIDE</span>
                  </button>
                )}
              </div>
            </div>

            {/* Typewriter Text Body with Authentic PIXEL FONT (DotGothic16) */}
            <div className="min-h-[48px] sm:min-h-[56px] flex items-center font-pixel-text text-base sm:text-lg md:text-xl font-medium text-[#2E1230] leading-relaxed antialiased">
              <p className="inline whitespace-pre-wrap select-none">
                {renderFormattedText(displayedText)}
                {isTyping && (
                  <span className="inline-block w-2.5 h-4.5 ml-1 bg-[#824B85] align-middle animate-pulse shadow-sm" />
                )}
              </p>
            </div>

            {/* Branching choices with stepped pixel buttons */}
            {choices && choices.length > 0 && !isTyping && (
              <div className="mt-2 pt-2 border-t-2 border-dashed border-[#824B85]/30 flex flex-wrap gap-2">
                {choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectChoice) onSelectChoice(choice.targetNodeId);
                    }}
                    className="px-3 py-1 bg-[#824B85] hover:bg-[#68356B] text-white border border-[#824B85] pixel-corners-sm font-pixel text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <span className="w-4 h-4 bg-[#EAE0C8] text-[#824B85] font-silkscreen font-bold text-[10px] flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span>{choice.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stepped Pixel Next Indicator */}
          <div className="shrink-0 self-center pl-2">
            {!isTyping && (!choices || choices.length === 0) ? (
              <div className="flex flex-col items-center text-[#824B85] animate-pixel-bounce">
                <span className="text-[9px] font-silkscreen font-bold tracking-wider mb-0.5">NEXT</span>
                {/* 8x8 Stepped Pixel Arrow SVG */}
                <svg className="w-3.5 h-3.5 text-[#824B85]" viewBox="0 0 8 8" fill="currentColor">
                  <rect x="0" y="0" width="8" height="2" />
                  <rect x="1" y="2" width="6" height="2" />
                  <rect x="2" y="4" width="4" height="2" />
                  <rect x="3" y="6" width="2" height="2" />
                </svg>
              </div>
            ) : (
              <div className="w-3.5 h-3.5 border-2 border-[#824B85]/40 pixel-corners-sm flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[#824B85]/30" />
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
