import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../lib/firebase';

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
}

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Converts Google Drive links or direct image URLs into displayable image URLs.
 * Extracts Google Drive file IDs and converts them to direct CDN image URLs (lh3.googleusercontent.com/d/FILE_ID).
 */
export function parsePhotoUrl(inputUrl: string): string {
  if (!inputUrl) return '';
  const trimmed = inputUrl.trim();
  
  // Handle Google Drive links (e.g. drive.google.com/file/d/ID/view, drive.google.com/open?id=ID, etc.)
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    const match = trimmed.match(/(?:file\/d\/|id=|d\/)([a-zA-Z0-9_-]{25,})/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  
  return trimmed;
}

/**
 * Validates file format and file size
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const mimeType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();
  const hasValidExtension = /\.(jpe?g|png|webp)$/i.test(fileName);

  if (!ALLOWED_IMAGE_TYPES.includes(mimeType) && !hasValidExtension) {
    return {
      valid: false,
      error: 'Invalid file format. Only JPG, JPEG, PNG, and WebP images are allowed.'
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeInMb} MB) exceeds the maximum allowed limit of 5 MB.`
    };
  }

  return { valid: true, file };
}

/**
 * Automatically resize and compress image on client-side before uploading
 * Max dimensions: 600x600, Quality: 0.85
 */
export async function compressAndResizeImage(
  file: File, 
  maxWidth = 600, 
  maxHeight = 600, 
  quality = 0.85
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image data.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create canvas rendering context.'));
          return;
        }

        // Enable high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer WebP or JPEG for compression
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const extension = outputMime === 'image/png' ? 'png' : 'jpg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas compression failed.'));
              return;
            }
            resolve({ blob, mimeType: outputMime, extension });
          },
          outputMime,
          quality
        );
      };

      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      } else {
        reject(new Error('Invalid image reader result.'));
      }
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a validated & compressed profile photo to Firebase Storage
 * and returns the public HTTPS download URL.
 * 
 * Target path: `staff_avatars/{userId}_{timestamp}.{ext}`
 */
export async function uploadStaffProfilePhoto(
  file: File,
  userId: string,
  performedByUserId: string
): Promise<{ success: boolean; downloadUrl?: string; downloadURL?: string; error?: string }> {
  try {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { blob, mimeType, extension } = await compressAndResizeImage(file);
    
    // Always convert to high-quality compressed base64 data URL first
    const base64Url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert image to base64'));
      reader.readAsDataURL(blob);
    });

    // Try uploading to Firebase Storage with a strict 3.5s timeout race
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `staff_avatars/${userId}_${timestamp}.${extension}`);
      
      const uploadPromise = (async () => {
        const uploadResult = await uploadBytes(storageRef, blob, {
          contentType: mimeType,
          customMetadata: {
            uploadedBy: performedByUserId,
            userId: userId,
            uploadedAt: new Date().toISOString()
          }
        });
        return await getDownloadURL(uploadResult.ref);
      })();

      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Firebase storage upload request timed out after 3.5 seconds')), 3500);
      });

      const downloadURL = await Promise.race([uploadPromise, timeoutPromise]);
      return {
        success: true,
        downloadUrl: downloadURL,
        downloadURL: downloadURL
      };
    } catch (storageErr: any) {
      console.warn('Firebase Storage upload notice, using compressed base64 photo fallback:', storageErr?.message || storageErr);
      return {
        success: true,
        downloadUrl: base64Url,
        downloadURL: base64Url
      };
    }
  } catch (error: any) {
    console.error('Image processing error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process profile photo.'
    };
  }
}
/**
 * Extracts professional fallback initials from a user's name
 */
export function getAvatarInitials(name: string): string {
  if (!name || !name.trim()) return 'ST';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
