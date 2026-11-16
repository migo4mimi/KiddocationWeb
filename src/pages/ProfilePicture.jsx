import { useEffect, useRef, useState } from 'react';
import {
  getProfilePictureAsset,
  invalidateProfilePictureUrl,
} from '../lib/profilePictures';
import { getProfilePictureLayout } from '../lib/profilePictureLayout';
import Avatar from './Avatar';
import './ProfilePicture.css';

export default function ProfilePicture({
  path,
  previewUrl,
  offsetX = 0,
  offsetY = 0,
  zoom = 100,
  avatarId,
  className = '',
  interactive = false,
  onOffsetChange,
}) {
  const [url, setUrl] = useState('');
  const [loadedPath, setLoadedPath] = useState('');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [urlRevision, setUrlRevision] = useState(0);
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const retriedPathRef = useRef('');

  useEffect(() => {
    retriedPathRef.current = '';
  }, [path]);

  useEffect(() => {
    let active = true;

    async function loadPicture(force = false) {
      if (previewUrl || !path) {
        setUrl('');
        setLoadedPath('');
        return;
      }

      try {
        const pictureUrl = await getProfilePictureAsset(path, force);
        if (!active) return;
        setUrl(pictureUrl);
        setLoadedPath(path);
      } catch (error) {
        if (!active) return;
        console.error('Profile picture error:', error);
        setUrl('');
        setLoadedPath(path);
      }
    }

    loadPicture(false);
    const refreshInterval = window.setInterval(() => loadPicture(true), 50 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(refreshInterval);
    };
  }, [path, previewUrl, urlRevision]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const displayUrl = previewUrl || (path && loadedPath === path ? url : '');
  const layout = getProfilePictureLayout({
    src: displayUrl,
    measuredSrc: naturalSize.src,
    viewportWidth: dimensions.width,
    viewportHeight: dimensions.height,
    naturalWidth: naturalSize.width,
    naturalHeight: naturalSize.height,
    zoom,
    offsetX,
    offsetY,
  });

  function handlePointerDown(event) {
    if (!interactive || !layout.visible || !viewportRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: layout.offsetX / (dimensions.width || 1),
      offsetY: layout.offsetY / (dimensions.height || 1),
    };
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!interactive || !drag || !viewport) return;

    const rect = viewport.getBoundingClientRect();
    const nextX = drag.offsetX + (event.clientX - drag.pointerX) / rect.width;
    const nextY = drag.offsetY + (event.clientY - drag.pointerY) / rect.height;

    onOffsetChange?.({
      x: Math.max(
        -layout.maxOffsetX / rect.width,
        Math.min(layout.maxOffsetX / rect.width, nextX)
      ),
      y: Math.max(
        -layout.maxOffsetY / rect.height,
        Math.min(layout.maxOffsetY / rect.height, nextY)
      ),
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  return (
    <span
      ref={viewportRef}
      className={`profile-picture ${interactive ? 'profile-picture--interactive' : ''} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
    >
      {displayUrl ? (
        <img
          key={displayUrl}
          className="profile-picture__image"
          src={displayUrl}
          alt=""
          draggable="false"
          style={{
            width: layout.visible ? `${layout.width}px` : '100%',
            height: layout.visible ? `${layout.height}px` : '100%',
            transform: `translate(calc(-50% + ${layout.offsetX}px), calc(-50% + ${layout.offsetY}px))`,
            opacity: layout.visible ? 1 : 0,
          }}
          onLoad={(event) => {
            setNaturalSize({
              src: displayUrl,
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            });
          }}
          onError={() => {
            console.error('Profile picture failed to load.');
            setUrl('');
            setLoadedPath('');
            if (retriedPathRef.current === path) return;
            retriedPathRef.current = path;
            invalidateProfilePictureUrl(path);
            setUrlRevision((revision) => revision + 1);
          }}
        />
      ) : path && !previewUrl ? (
        <span className="profile-picture__placeholder" aria-hidden="true" />
      ) : (
        <Avatar id={avatarId} className="profile-picture__fallback" />
      )}
    </span>
  );
}
