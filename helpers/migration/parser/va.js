const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const imageMapping = {};
const csvContent = fs.readFileSync('drive_image_map.csv', 'utf8');

const records = parse(csvContent, {
    delimiter: ',',
    skip_empty_lines: true
});

records.forEach(([path, googleId]) => {
    const cleanedPath = path.trim().replace(/^\/+/, '').replace(/\\/g, '/');
    const cleanedId = googleId ? googleId.trim() : null;

    if (cleanedPath && cleanedId) {
        imageMapping[cleanedPath] = cleanedId;
    }
});

function cleanHTML(str) {
    return str
        .replace(/&#39;/g, '')  // remove apostrophes
        .replace(/&quot;/g, '') // remove double quotes
        .replace(/&amp;/g, '&'); // replace ampersand correctly
}

// --- Helper function to clean file names ---
function cleanFileName(str) {
    const translitMap = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
        й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
        у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
        э: 'e', ю: 'yu', я: 'ya'
    };
    return str
        .toLowerCase()
        .split('')
        .map(c => translitMap[c] || c)
        .join('')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function normalizeIdentifierKey(str) {
    return str
        .replace(/[\u0410]/g, 'A') // Cyrillic А to Latin A
        .replace(/[\u0421]/g, 'C') // Cyrillic С to Latin C
        .replace(/[\u041E]/g, 'O') // Cyrillic О to Latin O
        .trim();
}

// --- Main parsing function ---
async function parseTitles() {
    const input = fs.readFileSync('site-sample.txt', 'utf8');

    const h2Matches = [...input.matchAll(/<h2>(.*?)<\/h2>/gi)];
    const fontMatches = [...input.matchAll(/<font[^>]*size="4"[^>]*style="[^"]*14pt[^"]*"[^>]*>(.*?)<\/font>/gi)];
    const allMatches = [...h2Matches, ...fontMatches];
    allMatches.sort((a, b) => a.index - b.index);

    if (h2Matches.length === 0) {
        console.error('❌ No <h2> titles found!');
        return;
    }

    const outputDir = path.join(__dirname, 'output_simple');
    const showsDir = path.join(outputDir, 'shows');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    if (!fs.existsSync(showsDir)) fs.mkdirSync(showsDir);

    const now = Math.floor(Date.now() / 1000);
    const showsIndex = {};
    const venueIndex = [];
    const tapersIndex = {};
    const ownIdIndex = {};

    for (const match of allMatches) {
        let title = cleanHTML(match[1].trim());
        const originalTitle = title
        // --- Fix HTML codes like &#39; to apostrophe
        title = title.replace(/&#39;/g, "'");

        // --- Detect if Various Artists
        // If not, skip immediately
        if (!title.includes('[VARIOUS ARTISTS]')) {
            console.log(`⏭️ Skipping non-VA title: ${title}`);
            continue;
        }
        title = title.replace('[VARIOUS ARTISTS] -', '').trim();

        // --- Detect and remove (Source X)
        const sourceMatch = title.match(/\(Source \d+\)/i);
        let source = '';
        if (sourceMatch) {
            source = sourceMatch[0].replace(/[()]/g, '').trim(); // remove parentheses
            title = title.replace(/\(Source \d+\)/i, '').trim(); // clean it from title
        }

        // --- Detect and remove [MASTER]
        let isMaster = false;
        if (title.includes('[MASTER]') || title.includes('[WEB MASTER]')) {
            isMaster = true;
            title = title.replace('[MASTER]', '').replace('[WEB MASTER]', '').trim();
        }

        // --- Detect category [AUDIO], [MISC], [COMPILATION]
        let categoryList = [];

        if (title.includes('[AUDIO]')) {
            categoryList.push('audio',);
            title = title.replace('[AUDIO]', '').trim();
        } else if (title.includes('[MISC]')) {
            categoryList.push('misc');
            title = title.replace('[MISC]', '').trim();
        } else {
            categoryList.push('video'); // default
        }

        if (!categoryList.includes('compilation')) {
            categoryList.push('compilation');
        }

        // --- Detect and remove [VCD], [DVD], [Blu-ray], [4K] from the title
        title = title.replace(/\[(VCD|DVD|Blu-ray|4K)\]/gi, '').trim();

        // Extract date
        let startDate = { day: "", month: "", year: "" };
        let endDate = { day: "", month: "", year: "" };
        let startDateUnix = null;
        let endDateUnix = null;

        // Detect double date [start -- end] for Various Artists
        if (title.includes('--')) {
            const dateRangeMatch = title.match(/\[(\d{2}|xx)\.(\d{2}|xx)\.(\d{4}|xxxx)\s*--\s*(\d{2}|xx)\.(\d{2}|xx)\.(\d{4}|xxxx)\]/i);
            if (dateRangeMatch) {
                startDate = { day: dateRangeMatch[1] === 'xx' ? "" : dateRangeMatch[1], month: dateRangeMatch[2] === 'xx' ? "" : dateRangeMatch[2], year: dateRangeMatch[3] === 'xxxx' ? "" : dateRangeMatch[3] };
                endDate = { day: dateRangeMatch[4] === 'xx' ? "" : dateRangeMatch[4], month: dateRangeMatch[5] === 'xx' ? "" : dateRangeMatch[5], year: dateRangeMatch[6] === 'xxxx' ? "" : dateRangeMatch[6] };

                if (startDate.day && startDate.month && startDate.year) {
                    startDateUnix = Math.floor(new Date(`${startDate.year}-${startDate.month}-${startDate.day}T00:00:00Z`).getTime() / 1000);
                }
                if (endDate.day && endDate.month && endDate.year) {
                    endDateUnix = Math.floor(new Date(`${endDate.year}-${endDate.month}-${endDate.day}T00:00:00Z`).getTime() / 1000);
                }

                title = title.replace(/\[(\d{2}|xx)\.(\d{2}|xx)\.(\d{4}|xxxx)\s*--\s*(\d{2}|xx)\.(\d{2}|xx)\.(\d{4}|xxxx)\]/i, '').trim();
                title = title.replace(/^-\s*/, '').trim();
            }
        }
        else if (title.match(/(\d{2}|xx)\.(\d{2}|xx)\.(\d{4}|xxxx)/i)) {
            const dateMatch = title.match(/(\d{2}|xx)\.(\d{2}|xx)\.(\d{4}|xxxx)/i);
            if (dateMatch) {
                startDate = { day: dateMatch[1] === 'xx' ? "" : dateMatch[1], month: dateMatch[2] === 'xx' ? "" : dateMatch[2], year: dateMatch[3] === 'xxxx' ? "" : dateMatch[3] };
                endDate = { ...startDate };

                if (startDate.day && startDate.month && startDate.year) {
                    startDateUnix = Math.floor(new Date(`${startDate.year}-${startDate.month}-${startDate.day}T00:00:00Z`).getTime() / 1000);
                    endDateUnix = startDateUnix;
                }
            }
        }
        else if (title.match(/\[(\d{4})\s*-\s*(\d{4})\]/i) || title.match(/\[(\d{4})\]/i)) {
            const yearRangeMatch = title.match(/\[(\d{4})\s*-\s*(\d{4})\]/i);
            const yearOnlyMatch = title.match(/\[(\d{4})\]/i);

            if (yearRangeMatch) {
                startDate = { day: "", month: "", year: yearRangeMatch[1] };
                endDate = { day: "", month: "", year: yearRangeMatch[2] };
                startDateUnix = null;
                endDateUnix = null;

                title = title.replace(/\[(\d{4})\s*-\s*(\d{4})\]/i, '').trim();
                title = title.replace(/^-\s*/, '');
            } else if (yearOnlyMatch) {
                startDate = { day: "", month: "", year: yearOnlyMatch[1] };
                endDate = { ...startDate };
                startDateUnix = null;
                endDateUnix = null;

                title = title.replace(/\[(\d{4})\]/i, '').trim();
                title = title.replace(/^-\s*/, '');
            }
        }
        else {
            console.log('⚠️ Unknown date format:', title);
        }

        // --- Extract showName early
        // --- Show name mapping ---
        const knownShowNames = [
            "TV Appearances", "Reunions - Full Circle", "Live Performances", "USA Live Performances", "Russia Live Performances", "The Late Show", "12 Angry Mothers Show", "2HIP4TV Show", "American Express Unstaged Show", "American Idol Show", "Arsenio Hall Show", "Barbara Walters Show", "Carson Daly Show", "Conan O'Brien Show", "David Letterman Show", "Dennis Miller Show", "Dick Cavett Show", "Ed Sullivan Show", "Ellen DeGeneres Show", "Fabio Fazio Show", "Gordo Freak Show", "Graham Norton Show", "Headbangers Ball", "Headbangers' Weekend", "Herman SIC TV Show", "Howard Stern Show", "IMX Show", "Ivan Urgant Show", "James Corden Show", "Jay Leno Show", "Jimmy Fallon Show", "Jimmy Kimmel Show", "Jon Stewart Show", "Jonathan Ross Show", "Jools Holland Show", "Julie Brown Show", "Larry King Show", "Mark Hoppus Show", "Mark Lawson Show", "Molly Meldrum Show", "Nils Ruf Show", "Ohne Filter TV Show", "Parkinson Show", "Payback Show", "Power 30 Show", "Ride With Funkmaster Flex Show", "Rosie O'Donnell Show", "So It Goes TV Broadcast", "Stephen Colbert Show", "Super Rock", "The Late Late Show", "The South Bank Show", "The Whistle Test", "Today Show", "Top Of The Pops", "Zane Meets Metallica Show", "Pop Deux", "ProSieben", "TF1 Friday", "BBC Radio 1 Rock Show", "BBC Radio 1&#39;s Big Weekend", "BBC Radio 1&#39;s Hackney Weekend", "BBC Radio 1&#39;s One Big Weekend", "BBC Radio 1&#39;s Live Lounge", "Radio Free L.A.", "Radiokulturhaus", "TRL", "Taratata", "VH1 Friday Rock Show", "VH1 Rock Show", "WAAF TV Real Rock", "WBZX Show", "WYSP Radio", "Lieder &amp; Leute"
        ];
        let showName = "";
        for (const name of knownShowNames) {
            const regex = new RegExp(name, "i");
            if (regex.test(title)) {
                showName = cleanHTML(name);
                title = title.replace(regex, '').trim(); // remove from title once captured
                break;
            }
        }

        // Location = everything after date
        let afterDate = '';


        afterDate = title.trim(); // title already cleaned

        afterDate = cleanHTML(afterDate);

        // --- Extract tvChannel early ---
        const knownTVChannels = [
            "BBC2 TV", "A-One TV", "Arte TV", "Bravo TV", "MTV Europe", "VH1", "WDR", "ZTV NYTT News", "ABC Television", "Asahi TV", "Canal+", "Channel 4", "Channel V", "Discovery Channel", "ESPN TV", "Fox TV", "Fuse TV", "G4 TV", "Global TV", "ITV", "MTV", "MTV2", "MuchMusic", "NBC", "RAI 3 TV", "RAI TV", "RTL2", "TF1", "Tyne Tees TV", "Universal TV", "Videomusic", "WTTW", "BBC Radio 2", "KCRW", "KXLU Radio", "Metro Radio", "Muz TV", "Rage TV", "Recovery TV", "Swedish Radio"
        ];

        let tvChannel = "";

        for (const channel of knownTVChannels) {
            const regex = new RegExp(channel, "i");
            if (regex.test(title)) {
                tvChannel = channel;
                title = title.replace(regex, '').trim();
                break;
            }
        }

        // Clean remaining dashes
        title = title.replace(/^[-\s]+/, '').trim();

        let city = '', state = '', country = '', venue = '', event = '';




        // Always clean location, even if showName was found
        if (showName) {
            afterDate = afterDate.replace(new RegExp(showName, 'i'), '').trim();
            afterDate = afterDate.replace(/^[-\s]+/, ''); // remove leading dash/space left behind
        }

        const locationParts = afterDate.split(/\s+-\s+/).map(p => p.trim());

        if (locationParts.length >= 1) city = locationParts[0] || '';
        if (locationParts.length >= 2) {
            const secondPart = locationParts[1] || '';
            if ((secondPart.length === 2 || secondPart.length === 3) && /^[A-Z]{2,3}$/i.test(secondPart)) {
                // State detected
                state = secondPart;
                if (locationParts.length >= 3) country = locationParts[2] || '';
                if (locationParts.length >= 4) venue = locationParts[3] || '';
                if (locationParts.length >= 5) event = locationParts.slice(4).join(' - ') || '';
            } else {
                // No state, normal country
                country = secondPart;
                if (locationParts.length >= 3) venue = locationParts[2] || '';
                if (locationParts.length >= 4) event = locationParts.slice(3).join(' - ') || '';
            }
        }
        event = cleanHTML(event);

        // --- If venue contains "Festival", move it to event ---
        if (/festival/i.test(venue)) {
            if (!event) {
                event = venue;
            } else {
                event = venue + ' - ' + event;  // Combine if event already exists
            }
            venue = "";  // Clear venue since it's a festival
        }

        // --- VENUE INDEX ADD ---
        if (venue && country) {  // skip empty venues or missing country

            // Check for duplicates
            const alreadyExists = venueIndex.some(v =>
                v.venue.toLowerCase() === venue.toLowerCase() &&
                v.location.city.toLowerCase() === city.toLowerCase() &&
                (v.location.state ? v.location.state.toLowerCase() : '') === (state ? state.toLowerCase() : '') &&
                v.location.country.toLowerCase() === country.toLowerCase()
            );

            if (!alreadyExists) {

                const locationObj = {
                    city: city,
                    state: state || "",
                    country: country
                };

                venueIndex.push({
                    venue: venue,
                    location: locationObj
                });
            }
        }

        const startDateFormatted = formatDateForFilename(startDate);
        const endDateFormatted = formatDateForFilename(endDate);
        const datePart = (startDateFormatted === endDateFormatted) ? startDateFormatted : `${startDateFormatted}_${endDateFormatted}`;

        const categoriesForFilename = categoryList.length > 0 ? categoryList.join('_') : 'video';

        const mainCategory = categoryList[0]; // use first category for filename


        const bandForFilename = 'various_artists';

        // If the date has any xx (partial/missing date), add location/event to filename
        let appendLocation = false;
        if (
            startDate.day === "" || startDate.month === "" || startDate.year === ""
            || startDate.day.toLowerCase() === "xx"
            || startDate.month.toLowerCase() === "xx"
            || startDate.year.toLowerCase() === "xxxx"
        ) {
            appendLocation = true;
        }

        let locationExtra = '';
        if (appendLocation) {
            let parts = [city, state, country, venue, event]
                .filter(x => x && x.trim() !== '')
                .map(x => cleanFileName(x));
            if (parts.length > 0) {
                locationExtra = '_' + parts.join('_');
            }
        }
        const filename = cleanFileName(`${bandForFilename}_${datePart}${source ? '_' + source.toLowerCase().replace(/\s+/g, '_') : ''}_${categoriesForFilename}`);

        function formatDateForFilename(dateObj) {
            if (!dateObj || !dateObj.year) return "xx.xx.xxxx";
            const day = dateObj.day ? dateObj.day : "xx";
            const month = dateObj.month ? dateObj.month : "xx";
            return `${day}_${month}_${dateObj.year}`;
        }

        // --- Parse length (hh:mm:ss) into seconds ---
        function parseLengthToSeconds(timeString) {
            if (!timeString) return null;
            const parts = timeString.split(':').map(Number);
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            return null;
        }

        const tapersMap = {};

        // --- ISO language mapping ---
        const languageMap = {
            English: 'en',
            Russian: 'ru',
            Espanol: 'es',
            Deutsch: 'de',
            Italiano: 'it',
            Francais: 'fr',
            Portugues: 'pt',
            Polish: 'pl',
            Japanese: 'jp'
        };
        function getIsoLanguage(language) {
            if (!language) return 'und';
            const clean = language.trim().toLowerCase();
            return languageMap[clean] || 'und';
        }

        const thisTitleStart = match.index;
        let thisTitleEnd = input.length;

        const nextMatch = allMatches.find(m => m.index > thisTitleStart);
        if (nextMatch) thisTitleEnd = nextMatch.index;

        const showContent = input.substring(thisTitleStart, thisTitleEnd);

        // --- Extract Lineup / Set bands ---
        let lineupBands = [];
        // Extract Lineup bands inside this show block
        const lineupBlockMatch = showContent.match(/<strong>(Lineup|Set)<\/strong>[\s\S]*?(<p>[\s\S]+?)(?:<\/p>|$)/i);


        if (lineupBlockMatch) {
            const lineupHTML = lineupBlockMatch[2];
            const bandLinks = [...lineupHTML.matchAll(/<a [^>]+>(.*?)<\/a>/gi)];

            if (bandLinks.length > 0) {
                for (const link of bandLinks) {
                    const linkText = cleanHTML(link[1]);
                    const bandName = linkText.split('-')[0].trim();
                    if (bandName && !lineupBands.includes(bandName)) {
                        lineupBands.push(bandName);
                    }
                }
            } else {
                // Fallback: extract from plain text
                const lines = lineupHTML.split(/<br\s*\/?>|\n/);
                for (const line of lines) {
                    const cleaned = cleanHTML(line).trim();
                    const bandName = cleaned.split('-')[0].trim();
                    if (bandName && !lineupBands.includes(bandName)) {
                        lineupBands.push(bandName);
                    }
                }
            }
        }
        bands = lineupBands;

        console.log('✅ Lineup bands found:', lineupBands);

        let parentOf = [];

        if (lineupBlockMatch) {   // 🟢 lineupMatches is still defined here!
            const lineupHTML = lineupBlockMatch[2];
            let lines = [];
            const bandLinks = [...lineupHTML.matchAll(/<a [^>]+>(.*?)<\/a>/gi)];

            if (bandLinks.length > 0) {
                // original logic for <a> tags
                lines = bandLinks.map(link => cleanHTML(link[1]));
            } else {
                // fallback: plain <br />–separated lines
                lines = lineupHTML.split(/<br\s*\/?>|\n/).map(l => cleanHTML(l.trim())).filter(Boolean);
            }

            for (const lineupTitle of lines) {
                const bandName = lineupTitle.split('-')[0].trim();
                const bandFileName = cleanFileName(bandName);

                const dateMatch = lineupTitle.match(/(\d{2}|xx)\.(\d{2}|xx)\.(\d{4}|xxxx)/);
                let childDate = 'xx_xx_xxxx';
                let dateObj = { day: "xx", month: "xx", year: "xxxx" };

                if (dateMatch) {
                    dateObj = {
                        day: dateMatch[1] === 'xx' ? "" : dateMatch[1],
                        month: dateMatch[2] === 'xx' ? "" : dateMatch[2],
                        year: dateMatch[3] === 'xxxx' ? "" : dateMatch[3]
                    };
                    childDate = `${dateObj.day || 'xx'}_${dateObj.month || 'xx'}_${dateObj.year || 'xxxx'}`;
                }

                // --- Determine category ---
                let childCategoryList = [];

                if (/\[audio\]/i.test(lineupTitle)) {
                    childCategoryList.push('audio');
                    if (/\[misc\]/i.test(lineupTitle)) {
                        childCategoryList.push('misc');
                    }
                } else {
                    childCategoryList.push('video');
                    if (/\[misc\]/i.test(lineupTitle)) {
                        childCategoryList.push('misc');
                    }
                }

                const childCategory = childCategoryList.join('_');

                // --- Add source if found ---
                let sourceSuffix = '';
                const sourceMatch = lineupTitle.match(/\(Source\s*(\d+)\)/i);
                if (sourceMatch) {
                    sourceSuffix = `_source_${sourceMatch[1]}`;
                }

                // --- Add location if date is partial ---
                let locationExtra = '';
                const needsLocation = !dateObj.day || !dateObj.month || !dateObj.year;
                if (needsLocation) {
                    const afterDatePartRaw = lineupTitle.split('-').slice(1).map(x => x.trim());

                    // Try to construct partial date string to match and remove from parts
                    const partsToRemove = [];
                    const dateRegex = /(\d{2}|xx)\.(\d{2}|xx)\.(\d{4}|xxxx)/;

                    afterDatePartRaw.forEach((part, idx) => {
                        if (dateRegex.test(part)) {
                            partsToRemove.push(idx);
                        }
                    });

                    const locationParts = afterDatePartRaw
                        .filter((_, idx) => !partsToRemove.includes(idx))
                        .map(x => cleanFileName(x))
                        .filter(Boolean);

                    if (locationParts.length > 0) {
                        locationExtra = '_' + locationParts.join('_');
                    }
                }

                // --- Construct final child filename ---
                let rawFilename = `${bandFileName}_${childDate}`;

                if (needsLocation && locationExtra) {
                    rawFilename += `${locationExtra}`;
                }

                if (sourceSuffix && !rawFilename.includes(sourceSuffix)) {
                    rawFilename += `_${sourceSuffix.replace(/^_+/, '')}`;
                }

                if (!rawFilename.endsWith(`_${childCategory}`)) {
                    rawFilename += `_${childCategory}`;
                }

                const childFileName = cleanFileName(rawFilename);
                parentOf.push(childFileName);
            }

        }


        const show = {
            originalTitle,
            created: now,
            lastUpdated: now,
            bands,
            startDate,
            startDateUnix,
            endDate,
            endDateUnix,
            location: {
                city,
                state,
                country,
                venue,
                event
            },
            tvChannel: tvChannel,
            showName: showName,
            source: source || '',
            category: categoryList,
            master: isMaster,
            public: true,
            ownIdentifier: "",
            tradeLabel: "",
            authoredBy: "",
            transferredBy: "",
            notes: "",
            master: isMaster,
            tapers: [],
            specs: {
                media: [],
                chapters: false,
                menu: false,
                length: null,
                video: {
                    format: "",
                    ratio: "",
                    resolution: "",
                    bitrateType: "",
                    bitrateKbps: null,
                    letterboxed: false
                },
                audio: {
                    language: "",
                    codec: "",
                    bitrateKbps: null,
                    channels: null
                },
                sourceDetail: { type: "", extra: "", medium: "" }
            },
            relatedShows: [],
            childOf: "",
            images: [],
            parentOf
        };

        // --- Parse DVD info ---
        const dvdInfoMatch = showContent.match(/DVD info:([\s\S]+?)(Lineup:|$)/i);
        if (dvdInfoMatch) {
            let dvdLines = dvdInfoMatch[1]
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/?[^>]+(>|$)/g, '')
                .replace(/&nbsp;/g, ' ')

                // 🔥 ADD THIS: force line breaks before important fields
                .replace(/(Note:)/gi, '\n$1')
                .replace(/(Own Identifier:)/gi, '\n$1')
                .replace(/(Authored by )/gi, '\n$1')
                .replace(/(Recorded by )/gi, '\n$1')
                .replace(/(Ripped by )/gi, '\n$1')
                .replace(/\\\s*$/gm, '') // backslash at end of lines

                .split('\n').map(x => x.trim()).filter(x => x);
            // Fix bad lines where multiple fields are stuck together
            let fixedLines = [];
            dvdLines.forEach(line => {
                // If a line contains multiple fields squashed together, split it
                const parts = line.split(/(Note:|Own Identifier:)/).filter(p => p.trim());
                if (parts.length > 2) {
                    // Recombine key:value lines properly
                    for (let i = 0; i < parts.length; i += 2) {
                        if (parts[i + 1]) {
                            fixedLines.push(parts[i] + parts[i + 1]);
                        } else {
                            fixedLines.push(parts[i]);
                        }
                    }
                } else {
                    fixedLines.push(line);
                }
            });
            dvdLines = fixedLines;

            dvdLines.forEach(line => {
                const [key, ...rest] = line.split(':');
                let value = rest.join(':').trim();

                if (!value) return;

                if (/size/i.test(key)) {
                    const matches = [...value.matchAll(/([\d,.]+)\s*(Gb|Mb|Kb)/gi)];
                    for (const match of matches) {
                        let num = parseFloat(match[1].replace(',', '.'));
                        const unit = match[2].toUpperCase();

                        let mediaType = '';

                        // --- Normalize size to GB (binary math) ---
                        let sizeGb = 0;

                        if (unit === 'KB') {
                            sizeGb = num / (1024 * 1024);
                        } else if (unit === 'MB') {
                            sizeGb = num / 1024;
                        } else if (unit === 'GB') {
                            sizeGb = num;
                        }

                        // --- Determine media type based on binary size ---
                        const sizeMb = sizeGb * 1024;  // binary MB
                        const sizeKb = sizeMb * 1024;  // binary KB

                        if (sizeMb <= 1.44) {
                            mediaType = "Floppy";
                        } else if (sizeMb <= 700) {
                            mediaType = "CD";
                        } else if (sizeGb <= 4.7) {
                            mediaType = "DVD-5";
                        } else if (sizeGb <= 9) {
                            mediaType = "DVD-9";
                        } else if (sizeGb <= 25) {
                            mediaType = "BD-25";
                        } else if (sizeGb <= 50) {
                            mediaType = "BD-50";
                        } else {
                            mediaType = "4K UHD";
                        }

                        // --- Format size and unit separately (3 digit rule) ---
                        let finalSize = 0;
                        let finalUnit = '';

                        if (sizeGb >= 1) {
                            finalSize = parseFloat(sizeGb.toFixed(2));
                            finalUnit = 'Gb';
                        } else if (sizeMb >= 100) {
                            finalSize = Math.round(sizeMb);
                            finalUnit = 'Mb';
                        } else if (sizeMb >= 1) {
                            finalSize = parseFloat(sizeMb.toFixed(2));
                            finalUnit = 'Mb';
                        } else {
                            finalSize = Math.round(sizeKb);
                            finalUnit = 'Kb';
                        }

                        show.specs.media.push({
                            type: mediaType,
                            size: finalSize,
                            unit: finalUnit
                        });
                    }
                }

                else if (/chapters/i.test(key)) {
                    show.specs.chapters = value.toLowerCase() === 'yes';
                } else if (/menu/i.test(key)) {
                    show.specs.menu = value.toLowerCase() === 'yes';
                } else if (/length/i.test(key)) {
                    show.specs.length = parseLengthToSeconds(value);
                } else if (/video/i.test(key)) {

                    // --- Clean HTML entities just in case
                    let videoContent = value.replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();

                    // --- Check for letterboxed BEFORE splitting
                    let isLetterboxed = false;
                    if (/letterboxed/i.test(videoContent)) {
                        isLetterboxed = true;
                        videoContent = videoContent.replace(/;?\s*(auto\s+)?letterboxed/i, '').trim();
                    }
                    // --- Split multiple entries (by ; or multiple spaces)
                    const videoParts = videoContent.split(/;\s*/).filter(v => v.trim());

                    show.specs.video = []; // Initialize as array now

                    videoParts.forEach(vLine => {
                        let entry = {
                            tvFormat: "",
                            ratio: "",
                            resolution: "",
                            bitrateType: "",
                            bitrateKbps: null,
                            fps: "",
                            standard: "",
                            codec: "",
                            letterboxed: false
                        };

                        let v = vLine.trim();

                        // --- Remove "Video:" and replace &nbsp;
                        v = v.replace(/^Video:\s*/i, '').replace(/&nbsp;/gi, ' ').trim();

                        // --- Check for letterboxed
                        if (/letterboxed/i.test(v)) {
                            entry.letterboxed = true;
                            v = v.replace(/;?\s*(auto\s+)?letterboxed/i, '').trim();
                        }

                        // --- Check for tvFormat
                        if (/^PAL\b/i.test(v)) {
                            entry.tvFormat = 'PAL';
                            v = v.replace(/^PAL\b/i, '').trim();
                        } else if (/^NTSC\b/i.test(v)) {
                            entry.tvFormat = 'NTSC';
                            v = v.replace(/^NTSC\b/i, '').trim();
                        }

                        // --- Extract ratio
                        const ratioMatch = v.match(/(?:\(|\b)(4:3|16:9)(?:\)|\b)/i);
                        if (ratioMatch) {
                            entry.ratio = ratioMatch[1];
                            v = v.replace(ratioMatch[0], '').trim();
                        }

                        // --- Extract resolution
                        const resMatch = v.match(/(\d{3,4}x\d{3,4})/i);
                        if (resMatch) {
                            entry.resolution = resMatch[1];
                            v = v.replace(resMatch[0], '').trim();
                        }

                        // --- Extract fps
                        const fpsMatch = v.match(/(\d+(\.\d+)?)\s*fps/i);
                        if (fpsMatch) {
                            entry.fps = fpsMatch[1];
                            v = v.replace(fpsMatch[0], '').trim();
                        }

                        // --- Extract bitrate
                        const brMatch = v.match(/(\d+(\.\d+)?)\s*kbps/i);
                        if (brMatch) {
                            entry.bitrateKbps = Math.round(parseFloat(brMatch[1]));
                            v = v.replace(brMatch[0], '').trim();
                        }

                        // --- Extract bitrate type
                        if (/vbr/i.test(v)) {
                            entry.bitrateType = 'VBR';
                            v = v.replace(/vbr/i, '').trim();
                        } else if (/cbr/i.test(v)) {
                            entry.bitrateType = 'CBR';
                            v = v.replace(/cbr/i, '').trim();
                        }

                        // --- Extract standard and codec (MPC-style lines)
                        // Windows Media Video 9/8 → WMV9/8
                        v = v.replace(/Windows Media Video\s*9/i, 'WMV9');
                        v = v.replace(/Windows Media Video\s*8/i, 'WMV8');
                        v = v.replace(/\s+/g, ' ').trim();

                        // MPEG4 Video → MPEG4
                        v = v.replace(/^MPEG4 Video/i, 'MPEG4');

                        const stdCodecMatch = v.match(/^([^\s(]+)(?:\s*\(([^)]+)\))?/i);
                        if (stdCodecMatch) {
                            entry.standard = stdCodecMatch[1].trim();
                            if (stdCodecMatch[2]) {
                                entry.codec = stdCodecMatch[2].trim();
                            }
                            v = v.replace(stdCodecMatch[0], '').trim();
                        }

                        // --- apply letterboxed if needed
                        entry.letterboxed = isLetterboxed;

                        // --- Push the entry if at least some data exists
                        const hasData = Object.values(entry).some(val => val !== "" && val !== null && val !== false);

                        // If the only data is letterboxed=true but everything else is empty, don't add a separate entry
                        if (hasData && !(entry.letterboxed && !entry.tvFormat && !entry.ratio && !entry.resolution && !entry.bitrateType && !entry.bitrateKbps && !entry.fps && !entry.standard && !entry.codec)) {
                            show.specs.video.push(entry);
                        }

                    });
                } else if (/audio/i.test(key)) {

                    let audioContent = cleanHTML(value).replace(/\s+/g, ' ').trim();

                    const audioParts = audioContent.split(/;\s*/).filter(a => a.trim());

                    show.specs.audio = []; // Turn into array now!

                    audioParts.forEach(aLine => {

                        let entry = {
                            language: "",
                            codec: "",
                            rateHz: null,
                            bitrateKbps: null,
                            channels: null
                        };

                        let a = aLine.trim();

                        // --- Ignore [pcm] or similar in brackets
                        a = a.replace(/\[[^\]]+\]/g, '').trim();

                        // --- Language ---
                        const langMatch = a.match(/\b(English|Russian|Deutsch|Italiano|Espanol|Francais|French|German|Spanish|Italian|Portuguese|Polish|Japanese)\b/i);
                        if (langMatch) {
                            const langMap = {
                                English: 'en',
                                Russian: 'ru',
                                Spanish: 'es',
                                German: 'de',
                                Deutsch: 'de',
                                Italian: 'it',
                                Italiano: 'it',
                                French: 'fr',
                                Francais: 'fr',
                                Portuguese: 'pt',
                                Portugues: 'pt',
                                Polish: 'pl',
                                Japanese: 'ja'
                            };
                            entry.language = langMap[langMatch[1]] || '';
                            a = a.replace(langMatch[0], '').trim();
                        } else if (/not specified|nnot specified/i.test(a)) {
                            entry.language = ""; // Explicit empty for Not specified
                            a = a.replace(/n?not specified/i, '').trim();
                        }

                        // --- Codec ---
                        // Remove "Audio" word and apply aliases
                        a = a.replace(/\bAudio\b/i, '').trim();

                        const codecAliases = {
                            'Dolby AC3': 'AC3',
                            'AC3': 'AC3',
                            'WAVE_FORMAT_EXTENSIBLE': 'PCM',
                            'QT PCM': 'PCM',
                            'MS ADPCM': 'PCM',
                            'Windows Media Audio': 'WMA',
                            'LinearPCM': 'LPCM',
                            'MPEG Audio': 'MPEG',
                            'MPEG1': 'MPEG1',
                            'AAC': 'AAC',
                            'FLAC': 'FLAC',
                            'PCM': 'PCM',
                            'LPCM': 'LPCM',
                            'DTS': 'DTS'
                        };

                        let codecFound = false;
                        for (const [key, valueAlias] of Object.entries(codecAliases)) {
                            const regex = new RegExp(`\\b${key}\\b`, 'i');
                            if (regex.test(a)) {
                                entry.codec = valueAlias;
                                a = a.replace(regex, '').trim();
                                codecFound = true;
                                break;
                            }
                        }

                        // --- Sample rate (Hz) ---
                        const rateMatch = a.match(/(\d{4,6})\s*hz/i);
                        if (rateMatch) {
                            entry.rateHz = parseInt(rateMatch[1], 10);
                            a = a.replace(rateMatch[0], '').trim();
                        }

                        // --- Channels ---
                        if (/stereo/i.test(a)) {
                            entry.channels = 2;
                            a = a.replace(/stereo/i, '').trim();
                        } else if (/mono/i.test(a)) {
                            entry.channels = 1;
                            a = a.replace(/mono/i, '').trim();
                        } else {
                            const chMatch = a.match(/(\d)\s*ch/i);
                            if (chMatch) {
                                entry.channels = parseInt(chMatch[1], 10);
                                a = a.replace(chMatch[0], '').trim();
                            }
                        }

                        // --- Bitrate ---
                        const brMatch = a.match(/(\d+(\.\d+)?)\s*(kbps|mbps)/i);
                        if (brMatch) {
                            let rate = parseFloat(brMatch[1]);
                            if (brMatch[3].toLowerCase() === 'mbps') rate *= 1000;
                            entry.bitrateKbps = Math.round(rate);
                            a = a.replace(brMatch[0], '').trim();
                        }

                        // --- Push the entry if it has at least a codec or channels or bitrate ---
                        const hasData = entry.codec || entry.channels || entry.bitrateKbps || entry.language || entry.rateHz;
                        if (hasData) {
                            show.specs.audio.push(entry);
                        }

                    });
                }
                else if (/source/i.test(key)) {
                    let src = value.trim();

                    // Step 1: Normalize recording type
                    src = src.replace(/\bAUD\b/, 'AMT');

                    let recordingType = "";
                    let sourceMediaType = "";
                    let finalMediaType = "";
                    let fileFormat = "";

                    let beforeDash = src;
                    let afterDash = "";

                    // Step 2: Split dash only outside parentheses
                    const dashMatch = src.match(/^([^\-()]+(?:\([^)]+\))?)\s*-\s*(.+)$/);
                    if (dashMatch) {
                        beforeDash = dashMatch[1].trim();
                        afterDash = dashMatch[2].trim();
                    }

                    // Step 3: Extract recordingType and parentheses content
                    const recMatch = beforeDash.match(/^([^(]+)\s*(\(([^)]+)\))?/);
                    if (recMatch) {
                        recordingType = recMatch[1].trim();
                        const insideParens = recMatch[3] ? recMatch[3].trim() : "";

                        if (insideParens.includes('-')) {
                            const parts = insideParens.split('-').map(p => p.trim());
                            sourceMediaType = parts[0] || "";
                            finalMediaType = parts[1] || "";
                        } else if (insideParens) {
                            sourceMediaType = insideParens;
                        }
                    } else {
                        // If no match at all, assume whole beforeDash is recordingType
                        recordingType = beforeDash.trim();
                    }

                    // Step 4: afterDash is the fileFormat (plus optional final media in parentheses)
                    if (afterDash) {
                        const formatMatch = afterDash.match(/^([^(]+)\s*(\(([^)]+)\))?/);
                        if (formatMatch) {
                            fileFormat = formatMatch[1].trim();
                            const extraFinalMedia = formatMatch[3] ? formatMatch[3].trim() : "";

                            if (!finalMediaType && extraFinalMedia) {
                                finalMediaType = extraFinalMedia;
                            }
                        } else {
                            fileFormat = afterDash.trim();
                        }
                    }

                    // Step 5: Standardize Blu-Ray → BD
                    if (/blu[- ]?ray/i.test(finalMediaType)) {
                        finalMediaType = "BD";
                    }

                    show.specs.sourceDetail = {
                        recordingType: recordingType || "",
                        sourceMediaType: sourceMediaType || "",
                        finalMediaType: finalMediaType || "",
                        fileFormat: fileFormat || ""
                    };
                }

                else if (/taper/i.test(key)) {
                    const tapers = value.split(/[\/,]/).map(x => x.trim()).map(t => {
                        if (/^TryingToBeTrue$/i.test(t)) return 'Vortex';
                        if (/^Unknown$/i.test(t)) return null;  // We'll filter it out
                        return t;
                    }).filter(t => t); // Remove nulls (Unknowns)

                    show.tapers = tapers;

                    tapers.forEach(t => {
                        if (!tapersMap[t]) tapersMap[t] = [];
                        tapersMap[t].push(filename);
                    });
                }
                else if (/own identifier/i.test(key)) {
                    show.ownIdentifier = value.replace(/\\+$/, '').trim();
                } else if (/note/i.test(key)) {
                    // 🟢 Start fix
                    // If previous line ended with 'Recorded and', append this line
                    if (value.toLowerCase() === 'recorded and') {
                        const nextLine = dvdLines[dvdLines.indexOf(line) + 1] || '';
                        if (/authored by/i.test(nextLine)) {
                            value = 'Recorded and ' + nextLine;
                        }
                    }
                    // 🟢 End fix

                    const combined = value.match(/Recorded and authored by (.+?)\./i);
                    const authored = value.match(/Authored by (.+?)\./i);
                    const ripped = value.match(/Ripped by (.+?)\./i);
                    const recorded = value.match(/Recorded by (.+?)\./i);
                    const edited = value.match(/Edited by (.+?)\./i);
                    const mixed = value.match(/Mixed by (.+?)\./i);
                    const transferred = value.match(/Transferred by (.+?)\./i);

                    if (combined) {
                        const person = combined[1].trim();
                        show.authoredBy = person;

                        // Also add to tapers if not already present
                        if (!show.tapers.includes(person)) {
                            show.tapers.push(person);
                        }

                        value = value.replace(/Recorded and authored by .+?\./i, '').trim();
                    }

                    if (authored) {
                        show.authoredBy = authored[1].trim();
                        value = value.replace(/Authored by .+?\./i, '').trim();
                    }

                    if (ripped) {
                        show.rippedBy = ripped[1].trim();
                        value = value.replace(/Ripped by .+?\./i, '').trim();
                    }

                    if (recorded) {
                        show.rippedBy = recorded[1].trim();
                        value = value.replace(/Recorded by .+?\./i, '').trim();
                    }

                    if (edited) {
                        show.authoredBy = edited[1].trim();  // Overwrite authoredBy if needed
                        value = value.replace(/Edited by .+?\./i, '').trim();
                    }

                    if (mixed) {
                        show.authoredBy = mixed[1].trim();
                        value = value.replace(/Mixed by .+?\./i, '').trim();
                    }
                    if (transferred) {
                        show.transferredBy = transferred[1].trim();
                        value = value.replace(/Transferred by .+?\./i, '').trim();
                    }
                    else {
                        show.notes = value.trim();
                    }

                    // Remove "Blu-ray trades only!" completely
                    value = value.replace(/Blu[- ]?ray trades only!?/i, '').trim();

                    // Remove relatedShows, childOf lines from notes
                    value = value.replace(/On the same disk[\s\S]*?(?:<|$)/gi, '').trim();
                    value = value.replace(/You can pick this one as[\s\S]*?(?:<|$)/gi, '').trim();

                    show.notes = cleanHTML(value.trim());
                }

                const imageMatches = [...showContent.matchAll(/<a[^>]+href="[^"]+\/([^\/"]+\.jpg)"/gi)];
                imageMatches.forEach(match => {
                    let imgName = match[1].replace(/^s/, '');  // remove starting "s" if any

                    // If path like si/1/20931.jpg, get folder and filename
                    let folder = '';
                    let filename = imgName;

                    const folderMatch = match[0].match(/\/([0-9]+)\/([^\/"]+\.jpg)/i);
                    if (folderMatch) {
                        folder = folderMatch[1];
                        filename = folderMatch[2];
                    } else {
                        // Fallback if no folder detected, try to extract from filename
                        const fallback = imgName.split('/');
                        if (fallback.length === 2) {
                            folder = fallback[0];
                            filename = fallback[1];
                        } else {
                            folder = '';  // might happen if really bad path
                        }
                    }

                    const fullFilename = `${folder}/${filename}`.replace(/^\/+/, '');  // normalize

                    // Lookup Google ID
                    const externalId = imageMapping[fullFilename] || null;

                    if (!show.images) show.images = [];

                    // Only add unique
                    if (!show.images.find(img => img.filename === filename && img.folder === folder)) {
                        show.images.push({
                            folder: folder,
                            filename: filename,
                            externalId: externalId
                        });
                    }
                });
            });
            // --- RELATED SHOWS and CHILD OF PARSING ---

            // First, search whole block not just dvdLines (since links may not be in line form)
            const relatedRegex = /On the same disk[\s:-]*(.*?)(?:<|$|\n)/gi;
            const childOfRegex = /You can pick this one as[\s:-]*(.*?)(?:<|$|\n)/gi;

            // Helper to convert title to filename (reuses your existing logic)
            function titleToFilename(titleText) {
                let tempTitle = cleanHTML(titleText)
                    .replace(/\[.*?\]/g, '') // Remove tags like [MISC], [AUDIO], etc
                    .replace(/\(.*?\)/g, '') // Remove (Source X), etc
                    .trim();

                // Extract date
                let dateMatch = tempTitle.match(/(\d{2}|xx)\.(\d{2}|xx)\.(\d{4}|xxxx)/i);
                let startDate = { day: "xx", month: "xx", year: "xxxx" };
                if (dateMatch) {
                    startDate.day = dateMatch[1];
                    startDate.month = dateMatch[2];
                    startDate.year = dateMatch[3];
                }

                let datePart = `${startDate.day}_${startDate.month}_${startDate.year}`;

                // Band (before date)
                let band = tempTitle;
                if (dateMatch) {
                    band = tempTitle.substring(0, tempTitle.indexOf(dateMatch[0])).trim().replace(/-$/, '').trim();
                }

                const cleanedBand = cleanFileName(band || "various_artists");

                // After date
                let afterDate = tempTitle;
                if (dateMatch) {
                    afterDate = tempTitle.substring(tempTitle.indexOf(dateMatch[0]) + dateMatch[0].length).trim();
                }

                let city = '', state = '', country = '', venue = '', event = '';
                const parts = afterDate.split(/\s*-\s*/).map(p => p.trim());

                if (parts.length >= 1) city = parts[0] || '';
                if (parts.length >= 2) {
                    const second = parts[1] || '';
                    if ((second.length === 2 || second.length === 3) && /^[A-Z]{2,3}$/i.test(second)) {
                        state = second;
                        if (parts.length >= 3) country = parts[2] || '';
                        if (parts.length >= 4) venue = parts[3] || '';
                        if (parts.length >= 5) event = parts.slice(4).join(' - ') || '';
                    } else {
                        country = second;
                        if (parts.length >= 3) venue = parts[2] || '';
                        if (parts.length >= 4) event = parts.slice(3).join(' - ') || '';
                    }
                }

                if (/festival/i.test(venue)) {
                    if (!event) {
                        event = venue;
                    } else {
                        event = venue + ' - ' + event;
                    }
                    venue = '';
                }

                // Detect if it's MISC or COMPILATION category (by checking the title text)
                const isMiscOrComp = /\[(MISC|COMPILATION)\]/i.test(titleText);

                // Check if date is incomplete
                let incompleteDate = (
                    startDate.day === "" || startDate.month === "" || startDate.year === "" ||
                    startDate.day.toLowerCase() === "xx" ||
                    startDate.month.toLowerCase() === "xx" ||
                    startDate.year.toLowerCase() === "xxxx"
                );

                let locationExtra = '';
                if (isMiscOrComp && incompleteDate) {
                    let locationParts = [city, state, country, venue, event]
                        .filter(x => x && x.trim() !== '')
                        .map(x => cleanFileName(x));
                    if (locationParts.length > 0) {
                        locationExtra = '_' + locationParts.join('_');
                    }
                }

                // Decide category suffix
                let categorySuffix = "video";
                if (/\[MISC\]/i.test(titleText)) {
                    categorySuffix = "video_misc";
                } else if (/\[COMPILATION\]/i.test(titleText)) {
                    categorySuffix = "video_compilation";
                }

                return `${cleanedBand}_${datePart}${locationExtra}_${categorySuffix}`;
            }
            let match;

            // --- Related Shows ---
            // Find the full section starting with "On the same disk" up to </p> or end of block
            const relatedSectionMatch = showContent.match(/On the same disk([\s\S]+?)(?:<\/p>|$)/i);

            if (relatedSectionMatch) {
                const relatedSection = relatedSectionMatch[1];

                // 1️⃣ First, extract <a> links
                const relatedLinks = [...relatedSection.matchAll(/<a [^>]+>(.*?)<\/a>/gi)];

                relatedLinks.forEach(linkMatch => {
                    const titleText = linkMatch[1].trim();

                    // 🚨 Skip if it's not plain text (contains <img> or other HTML)
                    if (/<[^>]+>/.test(titleText)) return;

                    const filename = titleToFilename(titleText);
                    if (
                        filename &&
                        filename !== cleanFileName(`${bandForFilename}_${datePart}${locationExtra}_${categoriesForFilename}`) &&
                        !show.relatedShows.includes(filename)
                    ) {
                        show.relatedShows.push(filename);
                    }
                });

                // 2️⃣ Then, extract quoted plain text references ONLY if they look like shows (must contain a date)
                // Look for "Band - dd.mm.yyyy" or similar patterns in quotes
                const textRefs = [...relatedSection.matchAll(/"([^"]+)"/g)];
                textRefs.forEach(refMatch => {
                    const titleText = refMatch[1];

                    // Must contain a dash (band - date), otherwise skip (this filters out alt, src, style etc)
                    if (!/ - /.test(titleText)) return;

                    // Must have a date (xx or real)
                    if (!/(\d{2}|xx)\.(\d{2}|xx)\.(\d{4}|xxxx)/.test(titleText)) return;

                    const filename = titleToFilename(titleText);
                    if (
                        filename &&
                        filename !== cleanFileName(`${bandForFilename}_${datePart}${locationExtra}_${categoriesForFilename}`) &&
                        !show.relatedShows.includes(filename)
                    ) {
                        show.relatedShows.push(filename);
                    }
                });
            }

            // --- Child Of ---
            while ((match = childOfRegex.exec(showContent)) !== null) {
                let ref = match[1] || "";
                if (ref) {
                    show.childOf = cleanHTML(ref.trim())
                        .replace(/^["“”‘’]+|["“”‘’]+$/g, '')  // remove leading/trailing quotes
                        .replace(/[\"\'\s.]+$/g, '')           // remove trailing quotes, slashes, spaces, and dots
                        .trim();
                }
            }
            // Remove "You can pick this one as..." from notes if present
            show.notes = show.notes.replace(/You can pick this one as.*$/i, '').trim();
        }

        if (show.tapers.length === 1) {
            const t = show.tapers[0].toLowerCase();
            if (t === 'vortex' || t === 'tryingtobetrue') {
                show.master = true;
            }
        }

        fs.writeFileSync(path.join(showsDir, `${filename}.json`), JSON.stringify(show, null, 2));
        // ✅ Add to the appropriate band group
        // Sort filenames inside each band
        for (const band in showsIndex) {
            showsIndex[band].sort((a, b) => a.localeCompare(b));
        }

        // Sort bands alphabetically (object keys don't have guaranteed order, but we can write a sorted version)
        const sortedShowsIndex = {};
        Object.keys(showsIndex).sort((a, b) => a.localeCompare(b)).forEach(band => {
            sortedShowsIndex[band] = showsIndex[band];
        });

        // Determine band name key for index (use original band name, not filename-safe version)
        const bandKey = bands.length > 0 ? bands[0] : 'Unknown';

        if (!showsIndex[bandKey]) {
            showsIndex[bandKey] = [];
        }
        showsIndex[bandKey].push(filename);

        // --- TAPERS INDEX ---
        const allTapers = [];

        // Start with the tapers array (which should already be split properly)
        if (show.tapers && Array.isArray(show.tapers)) {
            allTapers.push(...show.tapers);
        }

        // Now add rippedBy and recordedBy (both should be treated as possible multiple tapers)
        ['rippedBy', 'recordedBy'].forEach(field => {
            if (show[field]) {
                // Split by common separators: comma or slash
                show[field].split(/[\/,]/).map(s => s.trim()).forEach(name => {
                    if (name) allTapers.push(name);
                });
            }
        });

        // For each individual taper, add the filename
        allTapers.forEach(taper => {
            if (!taper) return;
            if (!tapersIndex[taper]) tapersIndex[taper] = [];
            if (!tapersIndex[taper].includes(filename)) {
                tapersIndex[taper].push(filename);
            }
        });

        // --- OWN IDENTIFIER INDEX ---
        if (show.ownIdentifier) {
            const ownId = normalizeIdentifierKey(show.ownIdentifier);
            if (!ownIdIndex[ownId]) ownIdIndex[ownId] = [];
            ownIdIndex[ownId].push(filename);
        }

        fs.writeFileSync(path.join(outputDir, 'shows_index.json'), JSON.stringify(sortedShowsIndex, null, 2));

        console.log(`✅ Parsed: ${title}`);
    }

    // Sort filenames within each band
    for (const band in showsIndex) {
        showsIndex[band].sort((a, b) => a.localeCompare(b));
    }

    // Sort bands alphabetically (object keys don't have guaranteed order, but we can write a sorted version)
    const sortedShowsIndex = {};
    Object.keys(showsIndex).sort((a, b) => a.localeCompare(b)).forEach(band => {
        sortedShowsIndex[band] = showsIndex[band];
    });

    // Write the sorted version to file
    fs.writeFileSync(path.join(outputDir, 'shows_index.json'), JSON.stringify(sortedShowsIndex, null, 2));

    // Sort venues alphabetically by venue name
    venueIndex.sort((a, b) => a.venue.localeCompare(b.venue));

    fs.writeFileSync(path.join(outputDir, 'venue_index.json'), JSON.stringify(venueIndex, null, 2));

    // --- Sort and write tapers_index ---
    Object.keys(tapersIndex).sort().forEach(taper => {
        tapersIndex[taper].sort();
    });
    fs.writeFileSync(path.join(outputDir, 'tapers_index.json'), JSON.stringify(tapersIndex, null, 2));

    // --- Sort and write own_identifier_index ---
    Object.keys(ownIdIndex).sort().forEach(ownId => {
        ownIdIndex[ownId].sort();
    });
    // --- Sort own identifiers alphabetically and their filenames ---
    const sortedIdentifierIndex = {};
    Object.keys(ownIdIndex).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .forEach(key => {
            sortedIdentifierIndex[key] = ownIdIndex[key].sort((x, y) => x.localeCompare(y));
        });

    fs.writeFileSync(path.join(outputDir, 'own_identifier_index.json'), JSON.stringify(sortedIdentifierIndex, null, 2));

    console.log('✅ All done!');
}

parseTitles();