/**
 * Resolves static media or uploaded assets against backend API URL if needed.
 */
export const getImageUrl = (url) => {
  if (!url) return null;
  // If it's already a full HTTP(S) URL or base64 data URL
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  const backendBase = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '') 
    : '';

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
};

export default getImageUrl;
