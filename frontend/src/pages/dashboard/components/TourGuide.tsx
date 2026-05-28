import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { type TourStepConfig, tourSteps } from '../types';

interface TourGuideProps {
  tourStep: number | null;
  currentStepConfig: TourStepConfig | undefined;
  popoverCoords: {
    top: number;
    left: number;
    arrowDirection: 'up' | 'down' | 'left' | 'right' | 'none';
  };
  highlightCoords: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
  handleCompleteTour: () => void;
  handlePrevTourStep: () => void;
  handleNextTourStep: () => void;
  getArrowStyle: (direction: 'up' | 'down' | 'left' | 'right' | 'none') => React.CSSProperties;
}

export default function TourGuide({
  tourStep,
  currentStepConfig,
  popoverCoords,
  highlightCoords,
  handleCompleteTour,
  handlePrevTourStep,
  handleNextTourStep,
  getArrowStyle,
}: TourGuideProps) {
  if (tourStep === null) return null;

  return (
    <>
      {/* Highlighter Box Overlay */}
      {highlightCoords && (
        <div 
          className="tour-highlight-box"
          style={{
            position: 'absolute',
            top: highlightCoords.top - 6,
            left: highlightCoords.left - 6,
            width: highlightCoords.width + 12,
            height: highlightCoords.height + 12,
            border: '2px solid var(--primary)',
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(3, 3, 10, 0.72), 0 0 15px var(--primary)',
            pointerEvents: 'none',
            zIndex: 1050,
            transition: 'all 0.25s ease'
          }}
        />
      )}

      {/* Fallback overlay when no target is highlighted */}
      {!currentStepConfig?.targetId && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 1040 }}
          onClick={handleCompleteTour}
        />
      )}

      {/* Floating Tour Popover Box */}
      {currentStepConfig && (
        <div 
          className="tour-popover-card"
          style={{
            position: currentStepConfig.targetId ? 'absolute' : 'fixed',
            top: currentStepConfig.targetId ? `${popoverCoords.top}px` : '50%',
            left: currentStepConfig.targetId ? `${popoverCoords.left}px` : '50%',
            transform: currentStepConfig.targetId ? 'none' : 'translate(-50%, -50%)',
            width: '460px',
            background: '#ffffff',
            border: '1px solid #000000',
            borderRadius: '16px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(15px)',
            zIndex: 1060,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible',
            boxSizing: 'border-box',
            transition: currentStepConfig.targetId ? 'top 0.25s ease, left 0.25s ease' : 'none'
          }}
        >
          {/* Arrow Indicator */}
          {currentStepConfig.targetId && popoverCoords.arrowDirection !== 'none' && (
            <div 
              className={`tour-popover-arrow arrow-${popoverCoords.arrowDirection}`}
              style={{
                position: 'absolute',
                width: '0',
                height: '0',
                borderStyle: 'solid',
                ...getArrowStyle(popoverCoords.arrowDirection)
              }}
            />
          )}

          <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px 20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
              <Sparkles size={18} style={{ color: 'var(--warning)' }} />
              {currentStepConfig.title}
            </h3>
            <button 
              className="modal-close-btn" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} 
              onClick={handleCompleteTour}
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="modal-body" style={{ padding: '20px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>{currentStepConfig.content}</p>

            {/* Progress Indicators */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '20px', justifyContent: 'center' }}>
              {tourSteps.map(s => (
                <span 
                  key={s.step} 
                  style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: s.step === tourStep ? 'var(--primary)' : 'rgba(0, 0, 0, 0.1)',
                    transition: 'background 0.2s'
                  }} 
                />
              ))}
            </div>
          </div>

          <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid var(--border-color)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              onClick={handleCompleteTour} 
              className="table-btn"
              style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
            >
              Skip Tour
            </button>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {tourStep > 1 && (
                <button onClick={handlePrevTourStep} className="table-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Back
                </button>
              )}
              <button 
                onClick={handleNextTourStep} 
                className="btn-bulk-approve"
                style={{ 
                  background: 'var(--primary)', 
                  boxShadow: '0 2px 8px var(--primary-glow)',
                  padding: '6px 16px',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {tourStep === tourSteps.length ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
