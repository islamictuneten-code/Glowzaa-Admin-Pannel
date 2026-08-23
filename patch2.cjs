const fs = require('fs');

let code = fs.readFileSync('src/components/admin/AdminStaff.tsx', 'utf8');

code = code.replace(
  /activeAdminUser\?\.name \|\| 'Administrator',\s*selectedStaff\.loginId \|\| selectedStaff\.email\s*\);/,
  `activeAdminUser?.name || 'Administrator',
        selectedStaff.loginId || selectedStaff.email,
        selectedStaff
      );`
);

fs.writeFileSync('src/components/admin/AdminStaff.tsx', code);
