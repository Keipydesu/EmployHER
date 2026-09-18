import { parentPort, workerData } from 'node:worker_threads';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
let task;
try {
  task = getDocument({
    data: new Uint8Array(workerData),
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    stopAtErrors: true,
    verbosity: 0,
  });
  const doc = await task.promise;
  if (doc.numPages > 5) throw new Error('PAGES');
  let text = '';
  for (let page = 1; page <= doc.numPages; page++) {
    const content = await (await doc.getPage(page)).getTextContent();
    text +=
      content.items
        .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
        .join('') + '\n';
    if (text.length > 20000) throw new Error('TEXT');
  }
  parentPort.postMessage({ text: text.trim() });
} catch (error) {
  const code =
    error.name === 'PasswordException'
      ? 'PASSWORD'
      : ['PAGES', 'TEXT'].includes(error.message)
        ? error.message
        : 'INVALID';
  parentPort.postMessage({ error: code });
} finally {
  await task?.destroy();
}
