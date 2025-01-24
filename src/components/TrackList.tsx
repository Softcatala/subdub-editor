import React, { useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Track } from '../types/Track';
import { IconButton, colors, typography } from '../styles/designSystem';
import { useTranslation } from 'react-i18next';
import { debounce } from 'lodash';
import { speakerService } from '../services/SpeakerService';

const ListContainer = styled.div`
  background-color: ${colors.background};
  padding-right: 10px;
  overflow-y: auto;
`;

const TrackRow = styled.div<{ speakerColor?: string; isDeleted?: boolean }>`
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid ${colors.border};
  position: relative;
  opacity: ${props => props.isDeleted ? 0.5 : 1};
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: ${props => props.speakerColor || 'transparent'};
  }
`;

const TrackTime = styled.span`
  width: 100px;
  font-size: ${typography.fontSize.small};
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  margin-left: 4px;
  color: ${colors.text};
  &:hover {
    background-color: ${colors.timeline};
  }
`;

const TrackTextContainer = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
`;

const TrackTextArea = styled.textarea<{ isDeleted?: boolean }>`
  flex-grow: 1;
  border: none;
  background: transparent;
  font-size: ${typography.fontSize.medium};
  resize: none;
  overflow: hidden;
  padding: 5px;
  font-family: ${typography.fontFamily};
  line-height: 1.5;
  min-height: 1.5em;
  color: ${props => props.isDeleted ? colors.disabled : colors.text};
  text-decoration: ${props => props.isDeleted ? 'line-through' : 'none'};
  
  &:read-only {
    cursor: default;
    user-select: text;
  }
`;

interface TrackListProps {
  tracks: Track[];
  onTrackChange: (trackId: number, updatedTrack: Track, recreateAudio: boolean) => void;
  onTimeChange: (time: number) => void;
  onEditTrack: (track: Track) => void;
  isDubbingService: boolean;
  showSpeakerColors: boolean;
  isMediaFullyLoaded?: boolean;
}

const TrackList: React.FC<TrackListProps> = ({
  tracks,
  onTrackChange,
  onTimeChange,
  onEditTrack,
  isDubbingService,
  showSpeakerColors,
  isMediaFullyLoaded = true,
}) => {
  const { t } = useTranslation();

  const handleTimeClick = (time: number) => {
    onTimeChange(time - 0.2);
  };

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, textarea.clientHeight)}px`;
  };

  const debouncedTrackChange = useMemo(
    () => debounce((trackId: number, updatedTrack: Track) => {
      onTrackChange(trackId, updatedTrack, true);
    }, 1000),
    [onTrackChange]
  );

  const handleTextareaChange = useCallback(
    (trackId: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const originalTrack = tracks.find(track => track.id === trackId);
      if (!originalTrack) return;
      const updatedTrack = { ...originalTrack };
      if (isDubbingService) {
        updatedTrack.translated_text = e.target.value;
        updatedTrack.needsResynthesis = updatedTrack.translated_text !== originalTrack.translated_text;
      } else {
        updatedTrack.text = e.target.value;
      }
      onTrackChange(trackId, updatedTrack, false);
      adjustTextareaHeight(e.target);

      debouncedTrackChange(trackId, updatedTrack);
    },
    [tracks, isDubbingService, onTrackChange, debouncedTrackChange]
  );

  useEffect(() => {
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('.track-textarea');
    textareas.forEach(adjustTextareaHeight);
  }, [tracks]);

  useEffect(() => {
    return () => {
      debouncedTrackChange.cancel();
    };
  }, [debouncedTrackChange]);

  const handleDeleteAndUndo = (trackId: number, deleted: boolean) => {
    const originalTrack = tracks.find(track => track.id === trackId);
    if (!originalTrack) return;
    const updatedTrack = { ...originalTrack, deleted };
    onTrackChange(trackId, updatedTrack, true);
  };

  return (
    <ListContainer>
      {tracks.map((track, index) => (
        <TrackRow 
          key={track.id} 
          speakerColor={showSpeakerColors ? speakerService.getSpeakerById(track.speaker_id)?.color : undefined}
          isDeleted={track.deleted}
        >
          <TrackTime onClick={() => handleTimeClick(track.start)}>
            {formatTime(track.start)}
          </TrackTime>
          <TrackTextContainer>
            <TrackTextArea
              className="track-textarea"
              value={isDubbingService ? track.translated_text : track.text}
              onChange={(e) => handleTextareaChange(track.id, e)}
              onFocus={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
              readOnly={track.deleted || !isMediaFullyLoaded}
              isDeleted={track.deleted}
            />
            {!track.deleted ? (
              <>
                <IconButton 
                  onClick={() => onEditTrack(track)} 
                  title={t('edit')}
                  disabled={!isMediaFullyLoaded}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                  </svg>
                </IconButton>
                <IconButton 
                  onClick={() => handleDeleteAndUndo(track.id, true)} 
                  title={t('delete')}
                  disabled={!isMediaFullyLoaded}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                  </svg>
                </IconButton>
              </>
            ) : (
              <IconButton 
                onClick={() => handleDeleteAndUndo(track.id, false)} 
                title={t('undo')}
                disabled={!isMediaFullyLoaded}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" fill="currentColor"/>
                </svg>
              </IconButton>
            )}
          </TrackTextContainer>
        </TrackRow>
      ))}
    </ListContainer>
  );
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default TrackList;
