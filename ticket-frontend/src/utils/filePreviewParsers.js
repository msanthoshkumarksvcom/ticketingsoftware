export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'];
export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v', 'ogg', 'ogv', 'mkv', 'avi', '3gp', 'mpeg'];
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'flac'];
export const PDF_EXTENSIONS = ['pdf'];
export const EXCEL_EXTENSIONS = ['xlsx', 'xls', 'csv', 'tsv', 'ods'];
export const PPT_EXTENSIONS = ['pptx', 'ppt', 'odp'];
export const WORD_EXTENSIONS = ['docx', 'doc', 'odt', 'rtf'];
export const TEXT_EXTENSIONS = ['txt', 'md', 'json', 'xml', 'log', 'yaml', 'yml', 'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'sql', 'ini'];
export const ARCHIVE_EXTENSIONS = ['zip', 'apk'];

export const ALL_DOCUMENT_EXTENSIONS = [
  ...PDF_EXTENSIONS,
  ...WORD_EXTENSIONS,
  ...EXCEL_EXTENSIONS,
  ...PPT_EXTENSIONS,
  ...TEXT_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...ARCHIVE_EXTENSIONS
];

export const ALL_DOCUMENT_ACCEPT = ALL_DOCUMENT_EXTENSIONS.map((ext) => `.${ext}`).join(',');

export const MIME_TYPE_BY_EXTENSION = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odp: 'application/vnd.oasis.opendocument.presentation',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  xml: 'application/xml',
  log: 'text/plain',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  jsx: 'text/javascript',
  ts: 'text/plain',
  tsx: 'text/plain',
  sql: 'text/plain',
  ini: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  ogg: 'video/ogg',
  ogv: 'video/ogg',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  '3gp': 'video/3gpp',
  mpeg: 'video/mpeg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  apk: 'application/vnd.android.package-archive',
  zip: 'application/zip'
};

export const getDocumentMaxBytes = (ext = '') =>
  (ext === 'apk' || ext === 'zip' || VIDEO_EXTENSIONS.includes(ext.toLowerCase()))
    ? 100 * 1024 * 1024
    : 25 * 1024 * 1024;

export const getFileExtension = (item) => {
  if (!item) return '';
  const candidates = typeof item === 'string'
    ? [item]
    : [item.name, item.file_name, item.url, item.file_url, item.title];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string' || candidate.startsWith('data:')) continue;
    const cleaned = candidate.split('?')[0].split('#')[0];
    const lastDot = cleaned.lastIndexOf('.');
    if (lastDot !== -1 && lastDot < cleaned.length - 1) {
      return cleaned.slice(lastDot + 1).toLowerCase();
    }
  }

  if (typeof item === 'object' && item.file_type) {
    return String(item.file_type).trim().toLowerCase();
  }
  return '';
};

export const getMimeTypeForExtension = (ext = '', fallback = 'application/octet-stream') =>
  MIME_TYPE_BY_EXTENSION[String(ext || '').toLowerCase()] || fallback;

export const detectFileCategory = (item) => {
  if (!item) return 'other';
  const ext = getFileExtension(item);
  const mime = typeof item === 'object' ? String(item.type || '').toLowerCase() : '';
  const mediaType = typeof item === 'object' ? String(item.mediaType || '').toLowerCase() : '';
  const rawUrl = typeof item === 'string' ? item : String(item.url || item.file_url || '');

  if (mediaType === 'video' || mime.startsWith('video/') || rawUrl.startsWith('data:video/') || VIDEO_EXTENSIONS.includes(ext)) {
    return 'video';
  }
  if (mediaType === 'audio' || mime.startsWith('audio/') || rawUrl.startsWith('data:audio/') || AUDIO_EXTENSIONS.includes(ext)) {
    return 'audio';
  }
  if (mediaType === 'image' || mime.startsWith('image/') || rawUrl.startsWith('data:image/') || IMAGE_EXTENSIONS.includes(ext)) {
    return 'image';
  }
  if (mime === 'application/pdf' || rawUrl.startsWith('data:application/pdf') || PDF_EXTENSIONS.includes(ext)) {
    return 'pdf';
  }
  if (
    EXCEL_EXTENSIONS.includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime === 'text/csv'
  ) {
    return 'excel';
  }
  if (
    PPT_EXTENSIONS.includes(ext) ||
    mime.includes('presentation') ||
    mime.includes('powerpoint')
  ) {
    return 'ppt';
  }
  if (
    WORD_EXTENSIONS.includes(ext) ||
    mime.includes('wordprocessingml') ||
    mime.includes('msword') ||
    mime.includes('opendocument.text')
  ) {
    return 'word';
  }
  if (ARCHIVE_EXTENSIONS.includes(ext) || mime.includes('zip') || mime.includes('android.package')) {
    return 'archive';
  }
  if (TEXT_EXTENSIONS.includes(ext) || mime.startsWith('text/') || mime.includes('json') || mime.includes('xml')) {
    return 'text';
  }
  return 'other';
};

export const formatFileByteSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const columnIndexToLetter = (index) => {
  let n = index;
  let result = '';
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
};

/**
 * Parse Excel / CSV / ODS workbook buffer into structured sheets using SheetJS.
 */
export const parseExcelArrayBuffer = async (arrayBuffer) => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const MAX_ROWS = 1500;

  const sheets = (workbook.SheetNames || []).map((name) => {
    const worksheet = workbook.Sheets[name];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: ''
    });

    const totalRows = rawRows.length;
    const rows = rawRows.slice(0, MAX_ROWS).map((row) =>
      Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : []
    );

    let colCount = 0;
    for (const r of rows) {
      if (r.length > colCount) colCount = r.length;
    }

    return {
      name,
      rows,
      colCount: Math.max(colCount, 1),
      totalRows,
      truncatedRows: Math.max(0, totalRows - MAX_ROWS)
    };
  });

  return { sheets };
};

const isZipBuffer = (arrayBuffer) => {
  if (!arrayBuffer || arrayBuffer.byteLength < 4) return false;
  const view = new Uint8Array(arrayBuffer, 0, 4);
  return view[0] === 0x50 && view[1] === 0x4b;
};

const extractReadableBinaryText = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  const lines = [];

  // Extract UTF-16LE readable strings (common in legacy OLE2 .ppt / .doc files)
  let current16 = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const lo = bytes[i];
    const hi = bytes[i + 1];
    if (hi === 0 && ((lo >= 32 && lo <= 126) || lo === 9 || lo === 10 || lo === 13)) {
      current16 += lo === 13 ? '\n' : String.fromCharCode(lo);
    } else {
      const cleaned = current16.trim();
      if (cleaned.length >= 6 && /[a-zA-Z0-9]/.test(cleaned)) {
        lines.push(cleaned);
      }
      current16 = '';
    }
  }

  // Fallback ASCII runs if UTF-16LE found very little
  if (lines.length < 3) {
    let currentAscii = '';
    for (let i = 0; i < bytes.length; i += 1) {
      const b = bytes[i];
      if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
        currentAscii += b === 13 ? '\n' : String.fromCharCode(b);
      } else {
        const cleaned = currentAscii.trim();
        if (cleaned.length >= 8 && /[a-zA-Z]{3}/.test(cleaned) && !/^(Root Entry|PowerPoint Document|SummaryInformation|Current User)$/i.test(cleaned)) {
          lines.push(cleaned);
        }
        currentAscii = '';
      }
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const raw of lines) {
    for (const part of raw.split(/\n+/)) {
      const text = part.replace(/\s+/g, ' ').trim();
      if (text.length >= 4 && !seen.has(text)) {
        seen.add(text);
        deduped.push(text);
      }
    }
  }
  return deduped;
};

const normalizeZipPath = (baseDir, target) => {
  const parts = `${baseDir}/${target}`.split('/');
  const resolved = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') resolved.pop();
    else resolved.push(part);
  }
  return resolved.join('/');
};

const parseXml = (xmlStr) => {
  const parser = new DOMParser();
  return parser.parseFromString(xmlStr, 'application/xml');
};

const getByLocalName = (root, localName) => {
  if (!root) return [];
  return Array.from(root.getElementsByTagName('*')).filter((el) => el.localName === localName);
};

/**
 * Parse PPTX / ODP / legacy PPT buffer into interactive slide structures.
 */
export const parsePowerPointArrayBuffer = async (arrayBuffer, ext = 'pptx') => {
  const createdUrls = [];
  const revokeUrls = () => {
    for (const url of createdUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
  };

  if (!isZipBuffer(arrayBuffer)) {
    const lines = extractReadableBinaryText(arrayBuffer);
    return {
      kind: 'legacy-ppt',
      aspectRatio: '16 / 9',
      slides: [
        {
          number: 1,
          title: 'Legacy PowerPoint (.ppt) Text Preview',
          backgroundColor: null,
          blocks: lines.slice(0, 250).map((line, idx) => ({
            type: 'text',
            isTitle: idx === 0,
            paragraphs: [{ text: line, bold: idx === 0, level: 0 }]
          })),
          tables: [],
          images: [],
          notes: lines.length === 0
            ? 'This legacy binary .ppt file contains embedded visuals/formatting that require .pptx format for full slide graphics.'
            : ''
        }
      ],
      revokeUrls
    };
  }

  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(arrayBuffer);

  // OpenDocument Presentation (.odp)
  if (ext === 'odp' && zip.file('content.xml')) {
    const contentXml = await zip.file('content.xml').async('string');
    const doc = parseXml(contentXml);
    const pages = getByLocalName(doc, 'page');

    const slides = [];
    for (let i = 0; i < pages.length; i += 1) {
      const page = pages[i];
      const textBoxes = getByLocalName(page, 'frame');
      const blocks = [];
      const images = [];

      for (const box of textBoxes) {
        const imgEls = getByLocalName(box, 'image');
        for (const imgEl of imgEls) {
          const href = imgEl.getAttribute('xlink:href') || imgEl.getAttribute('href');
          if (href && zip.file(href)) {
            const imgExt = href.split('.').pop()?.toLowerCase() || 'png';
            const rawBlob = await zip.file(href).async('arraybuffer');
            const objUrl = URL.createObjectURL(new Blob([rawBlob], { type: getMimeTypeForExtension(imgExt, 'image/png') }));
            createdUrls.push(objUrl);
            images.push({ url: objUrl, name: href.split('/').pop() });
          }
        }

        const ps = getByLocalName(box, 'p');
        const paragraphs = ps
          .map((p) => ({ text: (p.textContent || '').trim(), bold: false, level: 0 }))
          .filter((p) => p.text.length > 0);
        if (paragraphs.length > 0) {
          blocks.push({ type: 'text', isTitle: blocks.length === 0, paragraphs });
        }
      }

      slides.push({
        number: i + 1,
        title: blocks[0]?.paragraphs[0]?.text || `Slide ${i + 1}`,
        backgroundColor: null,
        blocks,
        tables: [],
        images,
        notes: ''
      });
    }

    return {
      kind: 'pptx',
      aspectRatio: '16 / 9',
      slides: slides.length > 0 ? slides : [{ number: 1, title: 'Empty Presentation', blocks: [], tables: [], images: [], notes: '' }],
      revokeUrls
    };
  }

  // Standard OOXML .pptx
  let slidePaths = [];
  let aspectRatio = '16 / 9';

  const presFile = zip.file('ppt/presentation.xml');
  const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');

  if (presFile) {
    const presDoc = parseXml(await presFile.async('string'));
    const sldSz = getByLocalName(presDoc, 'sldSz')[0];
    if (sldSz) {
      const cx = Number(sldSz.getAttribute('cx'));
      const cy = Number(sldSz.getAttribute('cy'));
      if (cx > 0 && cy > 0) {
        aspectRatio = `${cx} / ${cy}`;
      }
    }

    if (presRelsFile) {
      const relDoc = parseXml(await presRelsFile.async('string'));
      const relMap = {};
      for (const rel of getByLocalName(relDoc, 'Relationship')) {
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target');
        if (id && target) {
          relMap[id] = normalizeZipPath('ppt', target);
        }
      }
      for (const sldId of getByLocalName(presDoc, 'sldId')) {
        const rId = sldId.getAttribute('r:id') || sldId.getAttribute('id');
        if (rId && relMap[rId] && zip.file(relMap[rId])) {
          slidePaths.push(relMap[rId]);
        }
      }
    }
  }

  if (slidePaths.length === 0) {
    slidePaths = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
      .sort((a, b) => {
        const na = parseInt(a.match(/slide(\d+)\.xml$/i)?.[1] || '0', 10);
        const nb = parseInt(b.match(/slide(\d+)\.xml$/i)?.[1] || '0', 10);
        return na - nb;
      });
  }

  const slides = [];
  for (let i = 0; i < slidePaths.length; i += 1) {
    const slidePath = slidePaths[i];
    const slideXml = await zip.file(slidePath).async('string');
    const slideDoc = parseXml(slideXml);

    // Load per-slide relationships for images & notes
    const relPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const relTargets = {};
    let notesPath = null;
    if (zip.file(relPath)) {
      const relDoc = parseXml(await zip.file(relPath).async('string'));
      for (const rel of getByLocalName(relDoc, 'Relationship')) {
        const id = rel.getAttribute('Id');
        const type = rel.getAttribute('Type') || '';
        const target = rel.getAttribute('Target') || '';
        const fullTarget = normalizeZipPath('ppt/slides', target);
        if (id) relTargets[id] = fullTarget;
        if (type.includes('notesSlide')) notesPath = fullTarget;
      }
    }

    // Background color (solid)
    let backgroundColor = null;
    const bgEl = getByLocalName(slideDoc, 'bg')[0];
    if (bgEl) {
      const clr = getByLocalName(bgEl, 'srgbClr')[0]?.getAttribute('val');
      if (clr && /^[0-9A-Fa-f]{6}$/.test(clr)) {
        backgroundColor = `#${clr}`;
      }
    }

    // Extract text boxes / shapes
    const blocks = [];
    const shapes = getByLocalName(slideDoc, 'sp');
    for (const sp of shapes) {
      const ph = getByLocalName(sp, 'ph')[0];
      const phType = (ph?.getAttribute('type') || '').toLowerCase();
      const isTitle = phType === 'title' || phType === 'ctrtitle';
      const isSubTitle = phType === 'subtitle';

      const pEls = getByLocalName(sp, 'p');
      const paragraphs = [];
      for (const pEl of pEls) {
        const pPr = getByLocalName(pEl, 'pPr')[0];
        const level = Number(pPr?.getAttribute('lvl') || 0);
        const runs = getByLocalName(pEl, 'r');
        let lineText = '';
        let anyBold = isTitle;
        let colorHex = null;
        let fontSizePt = null;

        for (const rEl of runs) {
          const tEl = getByLocalName(rEl, 't')[0];
          if (tEl?.textContent) lineText += tEl.textContent;
          const rPr = getByLocalName(rEl, 'rPr')[0];
          if (rPr) {
            if (rPr.getAttribute('b') === '1') anyBold = true;
            const sz = Number(rPr.getAttribute('sz'));
            if (sz > 0 && !fontSizePt) fontSizePt = Math.round(sz / 100);
            const srgb = getByLocalName(rPr, 'srgbClr')[0]?.getAttribute('val');
            if (srgb && /^[0-9A-Fa-f]{6}$/.test(srgb) && !colorHex) {
              colorHex = `#${srgb}`;
            }
          }
        }

        if (!lineText) {
          // Capture direct <a:t> or field <a:fld>
          for (const tEl of getByLocalName(pEl, 't')) {
            if (tEl.textContent) lineText += tEl.textContent;
          }
        }

        const trimmed = lineText.trim();
        if (trimmed) {
          paragraphs.push({
            text: trimmed,
            bold: anyBold,
            level,
            color: colorHex,
            fontSizePt
          });
        }
      }

      if (paragraphs.length > 0) {
        blocks.push({ type: 'text', isTitle, isSubTitle, paragraphs });
      }
    }

    // Extract tables (<a:tbl>)
    const tables = [];
    for (const tblEl of getByLocalName(slideDoc, 'tbl')) {
      const trs = getByLocalName(tblEl, 'tr');
      const rows = trs.map((tr) =>
        getByLocalName(tr, 'tc').map((tc) =>
          getByLocalName(tc, 't')
            .map((t) => t.textContent || '')
            .join('')
            .trim()
        )
      );
      if (rows.length > 0) tables.push(rows);
    }

    // Extract embedded images (<p:pic>)
    const images = [];
    const seenImgPaths = new Set();
    for (const picEl of getByLocalName(slideDoc, 'pic')) {
      const blip = getByLocalName(picEl, 'blip')[0];
      const embedId = blip?.getAttribute('r:embed') || blip?.getAttribute('embed');
      const imgPath = embedId ? relTargets[embedId] : null;
      if (imgPath && !seenImgPaths.has(imgPath) && zip.file(imgPath)) {
        seenImgPaths.add(imgPath);
        const imgExt = imgPath.split('.').pop()?.toLowerCase() || 'png';
        if (IMAGE_EXTENSIONS.includes(imgExt)) {
          const buf = await zip.file(imgPath).async('arraybuffer');
          const objUrl = URL.createObjectURL(
            new Blob([buf], { type: getMimeTypeForExtension(imgExt, 'image/png') })
          );
          createdUrls.push(objUrl);
          images.push({ url: objUrl, name: imgPath.split('/').pop() });
        }
      }
    }

    // Extract speaker notes
    let notes = '';
    if (notesPath && zip.file(notesPath)) {
      const notesDoc = parseXml(await zip.file(notesPath).async('string'));
      const noteTexts = getByLocalName(notesDoc, 't')
        .map((t) => t.textContent || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (noteTexts && !/^\d+$/.test(noteTexts)) {
        notes = noteTexts;
      }
    }

    const titleBlock = blocks.find((b) => b.isTitle);
    const derivedTitle = titleBlock?.paragraphs[0]?.text || blocks[0]?.paragraphs[0]?.text || `Slide ${i + 1}`;

    slides.push({
      number: i + 1,
      title: derivedTitle,
      backgroundColor,
      blocks,
      tables,
      images,
      notes
    });
  }

  return {
    kind: 'pptx',
    aspectRatio,
    slides: slides.length > 0 ? slides : [{ number: 1, title: 'Empty Presentation', blocks: [], tables: [], images: [], notes: '' }],
    revokeUrls
  };
};

const sanitizeRenderedHtml = (rawHtml = '') =>
  String(rawHtml)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '#');

const stripRtfToText = (rtfStr = '') =>
  rtfStr
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\tab/g, '  ')
    .replace(/\{\*?\\[^{}]+?\}/g, '')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Parse Word (.docx, .odt, .rtf, .doc) buffer cleanly into HTML or formatted paragraphs.
 */
export const parseWordArrayBuffer = async (arrayBuffer, ext = 'docx') => {
  if (ext === 'rtf') {
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
    return { kind: 'text', paragraphs: stripRtfToText(raw).split(/\n+/).filter(Boolean) };
  }

  if (ext === 'odt' && isZipBuffer(arrayBuffer)) {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(arrayBuffer);
    const contentFile = zip.file('content.xml');
    if (contentFile) {
      const xml = await contentFile.async('string');
      const doc = parseXml(xml);
      const paragraphs = getByLocalName(doc, 'p')
        .map((el) => (el.textContent || '').trim())
        .filter(Boolean);
      return { kind: 'text', paragraphs };
    }
  }

  if (isZipBuffer(arrayBuffer)) {
    const mammothMod = await import('mammoth/mammoth.browser');
    const mammoth = mammothMod.default || mammothMod;
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return {
      kind: 'html',
      html: sanitizeRenderedHtml(result?.value || '<p>Document contains no readable text.</p>')
    };
  }

  // Legacy binary .doc fallback
  const lines = extractReadableBinaryText(arrayBuffer);
  return {
    kind: 'text',
    paragraphs: lines.length > 0 ? lines : ['No readable plain text could be extracted from this legacy .doc binary file.']
  };
};

/**
 * Parse ZIP / APK archive entries list.
 */
export const parseArchiveArrayBuffer = async (arrayBuffer) => {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(arrayBuffer);
  const allNames = Object.keys(zip.files).sort();
  const entries = allNames.slice(0, 400).map((name) => {
    const entry = zip.files[name];
    const size = entry?._data?.uncompressedSize ?? null;
    return {
      name,
      isDir: Boolean(entry?.dir),
      size: typeof size === 'number' ? formatFileByteSize(size) : '—'
    };
  });
  return {
    totalCount: allNames.length,
    truncatedCount: Math.max(0, allNames.length - 400),
    entries
  };
};

/**
 * Parse UTF-8 text / code / JSON buffer for inline code viewer.
 */
export const parseTextArrayBuffer = (arrayBuffer, ext = 'txt') => {
  const raw = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
  let text = raw;
  if (ext === 'json') {
    try {
      text = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      text = raw;
    }
  }
  const MAX_CHARS = 250000;
  const truncated = text.length > MAX_CHARS;
  const display = truncated ? text.slice(0, MAX_CHARS) : text;
  return {
    text: display,
    truncated,
    lineCount: display ? display.split(/\r?\n/).length : 0
  };
};
