import { API_BASE } from './apiConfig';

const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v|avi|mkv|3gp|mpeg)(\?.*)?$/i;

/**
 * Resolve any stored attachment URL (string or object) into a full loadable URL.
 */
export const getFullMediaUrl = (item) => {
  const raw = typeof item === 'string' ? item : (item?.url || item?.file_url || '');
  if (!raw || typeof raw !== 'string') return '';
  if (
    raw.startsWith('data:') ||
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('blob:')
  ) {
    return raw;
  }
  if (raw.startsWith('/')) {
    return `${API_BASE}${raw}`;
  }
  return `${API_BASE}/uploads/tickets/${raw}`;
};

/**
 * Detect whether a media item (string URL or attachment object) represents a video.
 */
export const isVideoMedia = (item) => {
  if (!item) return false;
  if (typeof item === 'object') {
    if (item.mediaType === 'video') return true;
    if (typeof item.type === 'string' && item.type.startsWith('video/')) return true;
    if (typeof item.name === 'string' && VIDEO_EXT_RE.test(item.name)) return true;
  }
  const raw = typeof item === 'string' ? item : (item?.url || item?.file_url || '');
  if (!raw || typeof raw !== 'string') return false;
  return raw.startsWith('data:video/') || VIDEO_EXT_RE.test(raw);
};

/**
 * Normalize a string URL or attachment object into a uniform preview descriptor.
 */
export const normalizeMediaItem = (item, index = 0, fallbackPrefix = 'Evidence') => {
  const url = getFullMediaUrl(item);
  const rawUrl = typeof item === 'string' ? item : (item?.url || item?.file_url || '');
  const mediaType = isVideoMedia(item) ? 'video' : 'image';
  const defaultExt = mediaType === 'video' ? 'mp4' : 'png';
  const rawName = typeof item === 'object' && item?.name ? item.name : '';
  const inferredName =
    rawName ||
    (rawUrl.startsWith('/uploads/') ? rawUrl.split('/').pop() : '') ||
    `${fallbackPrefix}-${index + 1}.${defaultExt}`;

  return {
    url,
    rawUrl,
    name: inferredName,
    type: (typeof item === 'object' && item?.type) || '',
    mediaType
  };
};

/**
 * Validate image or video file before reading/uploading.
 */
export const validateMediaFile = (file, maxBytes = 25 * 1024 * 1024) => {
  if (!file) return 'No file selected.';
  const isImg = file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name || '');
  const isVid = file.type?.startsWith('video/') || VIDEO_EXT_RE.test(file.name || '');
  if (!isImg && !isVid) {
    return `Unsupported file "${file.name}". Upload PNG, JPG, WEBP, GIF images or MP4, WEBM, MOV videos.`;
  }
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return `File "${file.name}" is too large. Max allowed size is ${maxMb}MB.`;
  }
  return '';
};

/**
 * Read a browser File into a base64 data URL.
 */
export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read ${file?.name || 'file'}.`));
    reader.readAsDataURL(file);
  });
