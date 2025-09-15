function parseResolutionStr(resStr) {
    if (!resStr) return null;
    const m = String(resStr)
        .replace(/[×X]/g, 'x')
        .replace(/\s+/g, '')
        .match(/(\d{2,5})x(\d{2,5})/i);
    if (!m) return null;
    let w = parseInt(m[1], 10), h = parseInt(m[2], 10);
    if (w < h) [w, h] = [h, w];
    return { w, h };
}

function extractResolution(show) {
    const vid = Array.isArray(show?.specs?.video)
        ? show.specs.video[0]
        : (show?.specs?.video || null);

    if (vid && Number(vid.width) && Number(vid.height)) {
        let w = Number(vid.width), h = Number(vid.height);
        if (w < h) [w, h] = [h, w];
        return { w, h };
    }

    const fromVideoStr = parseResolutionStr(vid?.resolution);
    if (fromVideoStr) return fromVideoStr;

    const fromFormat = parseResolutionStr(show?.specs?.sourceDetail?.fileFormat);
    if (fromFormat) return fromFormat;

    const fromSource = parseResolutionStr(show?.source);
    if (fromSource) return fromSource;

    return null;
}

const RES_BANDS = [
    { name: 'QQVGA', maxW: 160, maxH: 120 },
    { name: 'QCIF', maxW: 176, maxH: 144 },
    { name: 'GBA', maxW: 240, maxH: 160 },
    { name: 'QVGA', maxW: 320, maxH: 240 },
    { name: 'SIF', maxW: 352, maxH: 240 },
    { name: 'CIF', maxW: 352, maxH: 288 },
    { name: 'PSP', maxW: 480, maxH: 272 },
    { name: 'nHD', maxW: 640, maxH: 360 },
    { name: 'VGA', maxW: 640, maxH: 480 },
    { name: 'SD', maxW: 720, maxH: 576 },
    { name: 'qHD', maxW: 960, maxH: 540 },
    { name: 'HD', maxW: 1280, maxH: 720 },
    { name: 'FHD', maxW: 1920, maxH: 1080 },
    { name: '2K', maxW: 2560, maxH: 1440 },
    { name: '4K', maxW: 4096, maxH: 2160 },
    { name: '8K', maxW: 8192, maxH: 4320 },
];

const RES_COLORS = [
    '#ffb3b3',
    '#ffa6a6',
    '#ff9999',
    '#ff8c8c',
    '#ff8080',
    '#ff7373',
    '#ff6666',
    '#ff5959',
    '#ff4d4d',
    '#ffd24d',
    '#b8e986',
    '#9be26b',
    '#7ed64f',
    '#66cc42',
    '#4db83a',
    '#36a235',
];

function classifyResolution(w, h) {
    for (let i = 0; i < RES_BANDS.length; i++) {
        const b = RES_BANDS[i];
        if (w <= b.maxW && h <= b.maxH) {
            return { index: i, name: b.name, color: RES_COLORS[i] };
        }
    }
    const i = RES_BANDS.length - 1;
    return { index: i, name: '8K+', color: RES_COLORS[i] };
}

function buildResolutionBadges(show) {
    const res = extractResolution(show);
    if (!res) return '';

    const { w, h } = res;
    const cls = classifyResolution(w, h);

    return `
    <div class="format-labels">
      <span class="badge rounded-pill res-badge" style="background-color:${cls.color}" title="${w}×${h}">${cls.name}</span>
    </div>
  `;
}