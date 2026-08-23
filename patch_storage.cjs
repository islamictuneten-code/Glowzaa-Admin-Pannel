const fs = require('fs');

let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

code = code.replace(
  /export async function uploadStaffProfilePhoto\([\s\S]*?\}\s*\}/,
  `export async function uploadStaffProfilePhoto(
  file: File,
  userId: string,
  performedByUserId: string
): Promise<{ success: boolean; downloadUrl?: string; downloadURL?: string; error?: string }> {
  try {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { blob, mimeType } = await compressAndResizeImage(file);
    
    // Convert blob directly to Base64 Data URL to bypass Firebase Storage
    // This fits well within Firestore's 1MB document limit since it's highly compressed
    const base64Url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert image to base64'));
      reader.readAsDataURL(blob);
    });

    return {
      success: true,
      downloadUrl: base64Url,
      downloadURL: base64Url
    };
  } catch (error: any) {
    console.error('Image processing error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process profile photo.'
    };
  }
}`
);

fs.writeFileSync('src/services/storageService.ts', code);
