// Wrapped in an IIFE because the popup re-injects this file into the same
// isolated world on every open/refresh; top-level declarations would
// otherwise throw "Identifier already declared" on the second run.
(() => {
// Known aliases for each metric column. Columns are matched by header text
// so a layout change on mtr.tools doesn't silently read the wrong columns;
// the numbers in the array are the historical fallback indices.
const COLUMNS = {
  location: { aliases: ["location", "node", "host"], fallback: 0 },
  last: { aliases: ["last"], fallback: 5 },
  avg: { aliases: ["avg", "average"], fallback: 6 },
  best: { aliases: ["best", "min"], fallback: 7 },
  wrst: { aliases: ["wrst", "worst", "max"], fallback: 8 },
  stdev: { aliases: ["stdev", "std", "mdev"], fallback: 9 },
};

// mtr.tools renders its results as a CSS grid of <div> cells rather than a
// real <table>: a fixed number of cells per row, the first row being the
// header. This is the historical row width used to chunk the flat cell list.
const COLS_PER_ROW = 11;

// Split a flat array into fixed-size chunks (one per grid row).
function chunk(items, size) {
  const out = [];
  for (let i = 0; i + size <= items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

// Build a { metric: columnIndex } map from the header row, falling back to
// the historical fixed indices when a header can't be matched.
function resolveColumns(headerCells) {
  const headers = headerCells.map((h) => h.toLowerCase());

  const map = {};
  for (const [key, { aliases, fallback }] of Object.entries(COLUMNS)) {
    const index = headers.findIndex((h) =>
      aliases.some((alias) => h.includes(alias))
    );
    map[key] = index === -1 ? fallback : index;
  }
  return map;
}

// Arithmetic mean of a numeric array.
const mean = (values) =>
  values.reduce((sum, n) => sum + n, 0) / values.length;

// Linear-interpolated percentile (p in 0..100) of a numeric array.
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

function extractPingData() {
  // Bail out early when the popup is opened on a page that isn't mtr.tools.
  if (location.hostname !== "mtr.tools") {
    send({ action: "showModal", status: "not_ping" });
    return;
  }

  const grid = document.querySelector(".grid");
  const allRows = grid
    ? chunk(
        [...grid.querySelectorAll("div")].map((d) => d.innerText.trim()),
        COLS_PER_ROW
      )
    : [];

  // Need at least a header row plus one data row to compute anything.
  if (allRows.length < 2) {
    send({ action: "showModal", status: "empty" });
    return;
  }

  const cols = resolveColumns(allRows[0]);
  const rows = [];

  for (const cells of allRows.slice(1)) {
    const location = cells[cols.location];
    // parseFloat naturally strips a trailing "ms" unit from the cell text.
    const last = parseFloat(cells[cols.last]);
    const avg = parseFloat(cells[cols.avg]);
    const best = parseFloat(cells[cols.best]);
    const wrst = parseFloat(cells[cols.wrst]);
    const stdev = parseFloat(cells[cols.stdev]);

    // push only if valid numeric values
    if (location && [last, avg, best, wrst, stdev].every((n) => !isNaN(n))) {
      rows.push({ location, last, avg, best, wrst, stdev });
    }
  }

  // No results have streamed in yet (or the page has none).
  if (rows.length === 0) {
    send({ action: "showModal", status: "empty" });
    return;
  }

  const avgValues = rows.map((r) => r.avg);

  const data = {
    count: rows.length,
    last_mean: mean(rows.map((r) => r.last)),
    avg_mean: mean(avgValues),
    best_mean: mean(rows.map((r) => r.best)),
    worst_mean: mean(rows.map((r) => r.wrst)),
    avg_median: percentile(avgValues, 50),
    avg_p95: percentile(avgValues, 95),
    avg_top5: [...rows].sort((a, b) => b.avg - a.avg).slice(0, 5),
    rows,
  };

  // Send the data to the modal
  send({ action: "showModal", status: "ok", data });
}

// The popup may be closed while the observer is still running, which
// leaves no receiver; swallow that expected error.
function send(message) {
  try {
    chrome.runtime.sendMessage(message).catch(() => {});
  } catch (_) {
    /* ignore */
  }
}

// Recompute whenever mtr.tools appends or updates a result row, so the
// popup reflects locations as they stream in rather than a single early
// snapshot. Throttled rather than debounced: mtr.tools mutates the table
// continuously while results arrive, so a trailing debounce would keep
// resetting and never fire until the stream paused. This guarantees an
// update at most every 500ms even during a steady stream.
function watchForUpdates() {
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      extractPingData();
    }, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// The script is re-injected every time the popup opens; only wire up the
// observer once, but always emit a fresh snapshot.
extractPingData();
if (!window.__mtrtoolsWatching) {
  window.__mtrtoolsWatching = true;
  watchForUpdates();
}
})();
