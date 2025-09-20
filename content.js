// Extract values as numbers (strip ms)
function toNum(val) {
  if (!val) return NaN;
  return parseFloat(val.replace("ms", "").trim());
}

function mean(arr) {
  const valid = arr.filter((v) => !isNaN(v));
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function extractPingData() {
  const table = document.querySelector(".grid");
  const cells = Array.from(table.querySelectorAll("div"));

  // Each row has 11 cells → split them
  const rows = [];
  for (let i = 0; i < cells.length; i += 11) {
    const row = cells.slice(i, i + 11).map((cell) => cell.innerText.trim());
    // Push only if row has non-empty location (or enough cols)
    if (row.length === 11 && row[0] !== "") {
      rows.push(row);
    }
  }

  // Remove the first row (header)
  rows.shift();

  // Extract location + last, avg, best, wrst, stdev
  const results = rows.map((row) => ({
    location: row[0],
    last: toNum(row[5]),
    avg: toNum(row[6]),
    best: toNum(row[7]),
    wrst: toNum(row[8]),
    stdev: toNum(row[9]),
  }));

  const data = {
    last_mean: mean(results.map((r) => r.last)),
    avg_mean: mean(results.map((r) => r.avg)),
    best_mean: mean(results.map((r) => r.best)),
    worst_mean: mean(results.map((r) => r.wrst)),
    avg_top5: [...results].sort((a, b) => b.wrst - a.wrst).slice(0, 5),
  };

  // Send the data to the modal
  chrome.runtime.sendMessage({ action: "showModal", data });
}

// Run the extraction when the extension icon is clicked
extractPingData();
