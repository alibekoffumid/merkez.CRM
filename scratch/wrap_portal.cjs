const fs = require('fs');
const path = 'src/modules/Hotels/components/BookingModal.jsx';
let content = fs.readFileSync(path, 'utf8');

// Ensure createPortal import
if (!content.includes('createPortal')) {
    content = content.replace(/import React, \{ useState \} from 'react';/, "import React, { useState } from 'react';\nimport { createPortal } from 'react-dom';");
}

// Wrap return with createPortal
content = content.replace(/return \(\s+<div className="fixed top-0 left-0 w-screen h-screen z-\[10000\]/, "return createPortal(\n    <div className=\"fixed top-0 left-0 w-screen h-screen z-[10000]\"");
content = content.replace(/<\/div>,\s+document\.body\s+\);\s+};\s+export default BookingModal;/, ""); // Clean up if any
content = content.replace(/(\s+<\/div>\s+<\/div>\s+);\s+};\s+export default BookingModal;/, "$1    , document.body\n  );\n};\nexport default BookingModal;");

fs.writeFileSync(path, content);
console.log('Wrapped BookingModal in createPortal');
