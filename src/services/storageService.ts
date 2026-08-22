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
    // 1. Security & Validation check
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 2. Compress and resize image client-side
    const { blob, mimeType, extension } = await compressAndResizeImage(file);

    // 3. Prepare unique storage reference
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeUserId}_${Date.now()}.${extension}`;
    const storagePath = `staff_avatars/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // 4. Upload to Firebase Storage
    const metadata = {
      contentType: mimeType,
      customMetadata: {
        targetUserId: userId,
        uploadedBy: performedByUserId,
        uploadedAt: new Date().toISOString()
      }
    };

    await uploadBytes(storageRef, blob, metadata);

    // 5. Retrieve HTTPS Download URL
    const downloadUrl = await getDownloadURL(storageRef);

    return {
      success: true,
      downloadUrl,
      downloadURL: downloadUrl
    };
  } catch (error: any) {
    console.error('Firebase Storage upload error:', error);
    let message = 'Failed to upload profile photo to Firebase Storage.';
    if (error?.code === 'storage/unauthorized') {
      message = 'Permission denied. Only authenticated administrators or profile owners can upload.';
    } else if (error?.code === 'storage/quota-exceeded') {
      message = 'Storage quota limit exceeded. Please contact system admin.';
    } else if (error?.message) {
      message = error.message;
    }
    return {
      success: false,
      error: message
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
