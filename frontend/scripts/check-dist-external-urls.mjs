import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const distRoot = path.resolve('dist');
const externalUrl = /https?:\/\/[^\s"'`<>)}\]]+/gi;
const inertUrlAllowlist = [
  // User-initiated WhatsApp links opened only when a partner chooses to message.
  /^https:\/\/wa\.me\//,
  /^https:\/\/reactjs\.org\/docs\/error-decoder\.html\?invariant=$/,
  /^https:\/\/github\.com\/mswjs\/msw$/,
  /^https:\/\/github\.com\/ungap\/url-search-params\.$/,
  /^https:\/\/reactrouter\.com\/en\/main\/routers\/picking-a-router\.$/,
  /^http:\/\/localhost$/,
  /^http:\/\/www\.w3\.org\/(?:1999\/xlink|XML\/1998\/namespace|2000\/svg|1998\/Math\/MathML|1999\/xhtml)$/,
  // Inert documentation/license URLs embedded by html2canvas and jsPDF. They
  // are not runtime resources and are never requested by the generated app.
  /^https:\/\/html2canvas\.hertzen\.com$/,
  /^https:\/\/hertzen\.com$/,
  /^http:\/\/www\.phpied\.com\/rgb-color-parser-in-javascript\/$/,
  /^http:\/\/www\.myersdaily\.org\/joseph\/javascript\/md5\.js$/,
  /^http:\/\/www\.fpdf\.org\/en\/script\/script37\.php$/,
  /^http:\/\/opensource\.org\/licenses\/mit-license$/,
  /^https:\/\/www\.cs\.cmu\.edu\/~dst\/Adobe\/Gallery\/anon21jul01-pdf-encryption\.txt$/,
  /^https:\/\/github\.com\/foliojs\/pdfkit\/blob\/master\/lib\/security\.js$/,
  /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdfobject\/2\.1\.1\/pdfobject\.min\.js$/,
  /^http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#$/,
  /^http:\/\/jspdf\.default\.namespaceuri\/$/,
  /^https:\/\/github\.com\/babel\/babel\/blob\/main\/packages\/babel-helpers\/LICENSE$/,
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(entryPath) : [entryPath];
    }),
  );
  return nested.flat();
}

const files = await filesUnder(distRoot);
const matches = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const match of content.matchAll(externalUrl)) {
    if (inertUrlAllowlist.some((allowed) => allowed.test(match[0]))) continue;
    matches.push({
      file: path.relative(distRoot, file),
      url: match[0],
    });
  }
}

if (matches.length > 0) {
  console.error('Unapproved external URL literals found in the production output:');
  matches.forEach(({ file, url }) => console.error(`${file}: ${url}`));
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${files.length} production files; no unapproved external URL literals found (known inert framework and XML namespace URLs are allowlisted).`,
  );
}
