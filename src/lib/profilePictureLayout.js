export function getProfilePictureLayout({
  src,
  measuredSrc,
  viewportWidth,
  viewportHeight,
  naturalWidth,
  naturalHeight,
  zoom = 100,
  offsetX = 0,
  offsetY = 0,
}) {
  if (
    !src
    || src !== measuredSrc
    || !viewportWidth
    || !viewportHeight
    || !naturalWidth
    || !naturalHeight
  ) {
    return {
      visible: false,
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
      maxOffsetX: 0,
      maxOffsetY: 0,
    };
  }

  const scale = Math.max(
    viewportWidth / naturalWidth,
    viewportHeight / naturalHeight
  );
  const magnification = Math.min(300, Math.max(100, Number(zoom) || 100)) / 100;
  const width = naturalWidth * scale * magnification;
  const height = naturalHeight * scale * magnification;
  const maxOffsetX = Math.max(0, (width - viewportWidth) / 2);
  const maxOffsetY = Math.max(0, (height - viewportHeight) / 2);
  const displayedOffsetX = Math.max(
    -maxOffsetX / viewportWidth,
    Math.min(maxOffsetX / viewportWidth, Number(offsetX) || 0)
  );
  const displayedOffsetY = Math.max(
    -maxOffsetY / viewportHeight,
    Math.min(maxOffsetY / viewportHeight, Number(offsetY) || 0)
  );

  return {
    visible: true,
    width,
    height,
    offsetX: displayedOffsetX * viewportWidth,
    offsetY: displayedOffsetY * viewportHeight,
    maxOffsetX,
    maxOffsetY,
  };
}
