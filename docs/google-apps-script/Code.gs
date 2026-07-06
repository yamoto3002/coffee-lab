const SHEETS = {
  beans: {
    name: 'beans',
    headers: ['id', 'name', 'country', 'purchaseDate', 'stockWeight', 'weightLossPercentage', 'createdAt', 'updatedAt'],
  },
  roasts: {
    name: 'roasts',
    headers: ['id', 'roastDate', 'beanId', 'inputWeight', 'expectedOutputWeight', 'timelineJson', 'createdAt', 'updatedAt'],
  },
};

function doGet(e) {
  try {
    ensureSheets();
    const action = String((e && e.parameter && e.parameter.action) || 'ping');

    if (action === 'ping') {
      return jsonResponse({
        ok: true,
        message: 'Coffee Lab Apps Script is connected.',
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'getBeans') {
      return jsonResponse({ ok: true, beans: getRowsAsObjects(SHEETS.beans.name, SHEETS.beans.headers) });
    }

    if (action === 'getRoasts') {
      return jsonResponse({ ok: true, roasts: getRowsAsObjects(SHEETS.roasts.name, SHEETS.roasts.headers) });
    }

    return jsonResponse({ ok: false, error: 'Unknown GET action: ' + action });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    ensureSheets();

    const body = parsePostBody(e);
    const action = String(body.action || '');

    if (action === 'addBean') {
      const bean = normalizeBean(body.bean || body);
      appendRow(SHEETS.beans.name, SHEETS.beans.headers, bean, true);
      return jsonResponse({ ok: true, bean: bean });
    }

    if (action === 'updateBean') {
      const bean = normalizeBean(body.bean || body);
      upsertRow(SHEETS.beans.name, SHEETS.beans.headers, bean);
      return jsonResponse({ ok: true, bean: bean });
    }

    if (action === 'deleteBean') {
      deleteRowById(SHEETS.beans.name, String(body.id || (body.bean && body.bean.id) || ''));
      return jsonResponse({ ok: true });
    }

    if (action === 'addRoast') {
      const roast = normalizeRoast(body.roast || body);
      appendRow(SHEETS.roasts.name, SHEETS.roasts.headers, roast, true);
      return jsonResponse({ ok: true, roast: roast });
    }

    if (action === 'updateRoast') {
      const roast = normalizeRoast(body.roast || body);
      upsertRow(SHEETS.roasts.name, SHEETS.roasts.headers, roast);
      return jsonResponse({ ok: true, roast: roast });
    }

    if (action === 'deleteRoast') {
      deleteRowById(SHEETS.roasts.name, String(body.id || (body.roast && body.roast.id) || ''));
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'Unknown POST action: ' + action });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {
      // No-op. The lock may not have been acquired if waitLock failed.
    }
  }
}

function parsePostBody(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (error) {
      throw new Error('POST body is not valid JSON: ' + error.message);
    }
  }
  return e && e.parameter ? e.parameter : {};
}

function ensureSheets() {
  ensureSheet(SHEETS.beans.name, SHEETS.beans.headers);
  ensureSheet(SHEETS.roasts.name, SHEETS.roasts.headers);
}

function ensureSheet(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  const currentHeaders = headerRange.getValues()[0];
  const needsHeader = headers.some(function(header, index) {
    return currentHeaders[index] !== header;
  });

  if (needsHeader) {
    headerRange.setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function getRowsAsObjects(sheetName, headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .filter(function(row) {
      return row.some(function(value) {
        return value !== '';
      });
    })
    .map(function(row) {
      const item = {};
      headers.forEach(function(header, index) {
        item[header] = row[index] instanceof Date ? row[index].toISOString() : row[index];
      });
      return item;
    });
}

function appendRow(sheetName, headers, item, failIfExists) {
  if (!item.id) throw new Error(sheetName + ' row requires id.');
  if (failIfExists && findRowById(sheetName, item.id) > 0) {
    throw new Error(sheetName + ' id already exists: ' + item.id);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.appendRow(headers.map(function(header) {
    return item[header] === undefined || item[header] === null ? '' : item[header];
  }));
}

function upsertRow(sheetName, headers, item) {
  if (!item.id) throw new Error(sheetName + ' row requires id.');
  const rowNumber = findRowById(sheetName, item.id);
  if (rowNumber <= 0) {
    appendRow(sheetName, headers, item, false);
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([
    headers.map(function(header) {
      return item[header] === undefined || item[header] === null ? '' : item[header];
    }),
  ]);
}

function deleteRowById(sheetName, id) {
  if (!id) throw new Error('delete requires id.');
  const rowNumber = findRowById(sheetName, id);
  if (rowNumber > 0) {
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName).deleteRow(rowNumber);
  }
}

function findRowById(sheetName, id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return -1;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (String(ids[index][0]) === String(id)) {
      return index + 2;
    }
  }
  return -1;
}

function normalizeBean(input) {
  const now = new Date().toISOString();
  return {
    id: String(input.id || ''),
    name: String(input.name || ''),
    country: String(input.country || ''),
    purchaseDate: String(input.purchaseDate || ''),
    stockWeight: toNumber(input.stockWeight),
    weightLossPercentage: toNumber(input.weightLossPercentage || 15),
    createdAt: String(input.createdAt || now),
    updatedAt: now,
  };
}

function normalizeRoast(input) {
  const now = new Date().toISOString();
  return {
    id: String(input.id || ''),
    roastDate: String(input.roastDate || ''),
    beanId: String(input.beanId || ''),
    inputWeight: toNumber(input.inputWeight),
    expectedOutputWeight: toNumber(input.expectedOutputWeight),
    timelineJson: String(input.timelineJson || '[]'),
    createdAt: String(input.createdAt || now),
    updatedAt: now,
  };
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
