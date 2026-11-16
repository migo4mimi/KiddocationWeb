import { supabase } from './supabase';

const SIGNED_URL_REFRESH_MS = 50 * 60 * 1000;
const IMAGE_CACHE_NAME = 'kiddocation-profile-pictures-v1';
const signedUrls = new Map();
const preloadedImages = new Map();
const cachedObjectUrls = new Map();
const loadingAssets = new Map();

function imageCacheKey(path) {
  return new Request(
    `${window.location.origin}/__kiddocation_profile_picture__/${encodeURIComponent(path)}`
  );
}

export function getCachedProfilePictureUrl(path) {
  const cached = signedUrls.get(path);
  if (!cached || cached.expiresAt <= Date.now()) return '';
  return cached.url || '';
}

export async function getProfilePictureUrl(path, refresh = false) {
  if (!path) return '';

  const cached = signedUrls.get(path);
  if (
    cached
    && ((!refresh && cached.expiresAt > Date.now()) || !cached.settled)
  ) {
    return cached.promise;
  }

  signedUrls.delete(path);
  const entry = {
    url: '',
    expiresAt: Date.now() + SIGNED_URL_REFRESH_MS,
    settled: false,
    promise: null,
  };
  entry.promise = supabase.storage
    .from('profile-pictures')
    .createSignedUrl(path, 3600)
    .then(({ data, error }) => {
      if (error) throw error;
      entry.url = data.signedUrl;
      entry.settled = true;
      return entry.url;
    })
    .catch((error) => {
      entry.settled = true;
      if (signedUrls.get(path) === entry) signedUrls.delete(path);
      throw error;
    });

  signedUrls.set(path, entry);
  return entry.promise;
}

export async function getCachedProfilePictureObjectUrl(path) {
  if (!path || !('caches' in window)) return '';
  const cachedUrl = cachedObjectUrls.get(path);
  if (cachedUrl) return cachedUrl;

  const cache = await window.caches.open(IMAGE_CACHE_NAME);
  const response = await cache.match(imageCacheKey(path));
  if (!response) return '';

  const objectUrl = URL.createObjectURL(await response.blob());
  cachedObjectUrls.set(path, objectUrl);
  return objectUrl;
}

async function cacheProfilePicture(path, signedUrl) {
  if (!('caches' in window)) return signedUrl;

  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Could not load profile picture (${response.status}).`);
  }

  const image = await response.blob();
  const cache = await window.caches.open(IMAGE_CACHE_NAME);
  await cache.put(
    imageCacheKey(path),
    new Response(image, {
      headers: { 'Content-Type': image.type || 'image/jpeg' },
    })
  );

  const previousUrl = cachedObjectUrls.get(path);
  const objectUrl = URL.createObjectURL(image);
  cachedObjectUrls.set(path, objectUrl);
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  return objectUrl;
}

export async function getProfilePictureAsset(path, refresh = false) {
  if (cachedObjectUrls.has(path)) return cachedObjectUrls.get(path);
  if (loadingAssets.has(path)) return loadingAssets.get(path);

  const task = (async () => {
    let cachedImage = '';
    try {
      cachedImage = await getCachedProfilePictureObjectUrl(path);
    } catch (error) {
      console.error('Could not read the cached profile picture:', error);
    }
    if (cachedImage) return cachedImage;

    const signedUrl = await getProfilePictureUrl(path, refresh);
    try {
      return await cacheProfilePicture(path, signedUrl);
    } catch (error) {
      console.error('Could not cache profile picture:', error);
      return signedUrl;
    }
  })();

  loadingAssets.set(path, task);
  try {
    return await task;
  } finally {
    loadingAssets.delete(path);
  }
}

export async function preloadProfilePicture(path) {
  const url = await getProfilePictureAsset(path);
  if (!url || preloadedImages.has(url)) return;

  const image = new Image();
  preloadedImages.set(url, image);
  image.onerror = () => {
    preloadedImages.delete(url);
  };
  image.src = url;
}

export function invalidateProfilePictureUrl(path) {
  signedUrls.delete(path);
  cachedObjectUrls.delete(path);
  if ('caches' in window) {
    window.caches.open(IMAGE_CACHE_NAME)
      .then((cache) => cache.delete(imageCacheKey(path)))
      .catch((error) => console.error('Could not clear the cached profile picture:', error));
  }
}
