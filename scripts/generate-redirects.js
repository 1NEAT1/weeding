const fs = require('fs');
const path = require('path');
const { GUEST_PATHS } = require('../site-meta.config');

const lines = GUEST_PATHS.flatMap((slug) => [
  `/${slug}    /${slug}/index.html    200`,
  `/${slug}/   /${slug}/index.html    200`,
]);

lines.push('/*    /index.html    200');

const outputPath = path.join(__dirname, '..', 'public', '_redirects');
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`Generated ${outputPath} for ${GUEST_PATHS.length} guest paths`);
