const fs = require('fs');

let code = fs.readFileSync('src/services/staffAuthService.ts', 'utf8');

code = code.replace(
  /export async function updateStaffProfile\([\s\S]*?\): Promise<\{ success: boolean; error\?: string \}> \{[\s\S]*?const admin = normalizeAdminUser\(adminUser, adminNameFallback\);\s*const userRef = doc\(db, 'users', userId\);\s*const existingSnap = await getDoc\(userRef\);\s*let existingData: Partial<AuthUser> = \{\};\s*if \(existingSnap\.exists\(\)\) \{\s*existingData = existingSnap\.data\(\) as AuthUser;\s*\}/,
  `export async function updateStaffProfile(
  userId: string,
  updates: UpdateStaffInput,
  adminUser: AuthUser | { uid: string; name?: string } | string,
  adminNameFallback?: string,
  targetLoginId?: string,
  existingUser?: Partial<AuthUser>
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = normalizeAdminUser(adminUser, adminNameFallback);
    const userRef = doc(db, 'users', userId);
    
    let existingData: Partial<AuthUser> = existingUser || {};
    if (!existingUser) {
      try {
        const existingSnap = await getDoc(userRef);
        if (existingSnap.exists()) {
          existingData = existingSnap.data() as AuthUser;
        }
      } catch (e) {
        console.warn('Failed to fetch existing user data:', e);
      }
    }`
);

fs.writeFileSync('src/services/staffAuthService.ts', code);
