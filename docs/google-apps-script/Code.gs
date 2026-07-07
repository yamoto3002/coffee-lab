const SHEETS = {
  beans: {
    name: 'beans',
    headers: [
      'id',
      'name',
      'country',
      'region',
      'farm',
      'producer',
      'altitude',
      'variety',
      'process',
      'cropYear',
      'purchaseShop',
      'purchaseDate',
      'purchasePrice',
      'initialWeight',
      'currentWeight',
      'weightLossPercentage',
      'notes',
      'photoUrl',
      'createdAt',
      'updatedAt',
    ],
  },
  roasts: {
    name: 'roasts',
    headers: [
      'id',
      'roastDate',
      'beanId',
      'greenWeight',
      'roastedWeight',
      'yellowTime',
      'firstCrackTime',
      'dropTime',
      'developmentTime',
      'developmentRatio',
      'lossRatio',
      'status',
      'notes',
      'timelineJson',
      'createdAt',
      'updatedAt',
    ],
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
      return jsonResponse({ ok: true, beans: getRowsAsObjects(SHEETS.beans.name) });
    }

    if (action === 'getRoasts') {
      return jsonResponse({ ok: true, roasts: getRowsAsObjects(SHEETS.roasts.name) });
    }

    return jsonResponse({ ok: false, error: 'Unknown GET action: ' + action });
  } catch (error) {
    return jsonResponse({ ok: false, error: errorMessage(error) });
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
      appendRow(SHEETS.beans.name, bean, true);
      return jsonResponse({ ok: true, bean: bean });
    }

    if (action === 'updateBean') {
      const bean = normalizeBean(body.bean || body);
      upsertRow(SHEETS.beans.name, bean);
      return jsonResponse({ ok: true, bean: bean });
    }

    if (action === 'deleteBean') {
      deleteRowById(SHEETS.beans.name, String(body.id || (body.bean && body.bean.id) || ''));
      return jsonResponse({ ok: true });
    }

    if (action === 'addRoast') {
      const roast = normalizeRoast(body.roast || body);
      appendRow(SHEETS.roasts.name, roast, true);
      return jsonResponse({ ok: true, roast: roast });
    }

    if (action === 'updateRoast') {
      const roast = normalizeRoast(body.roast || body);
      upsertRow(SHEETS.roasts.name, roast);
      return jsonResponse({ ok: true, roast: roast });
    }

    if (action === 'deleteRoast') {
      deleteRowById(SHEETS.roasts.name, String(body.id || (body.roast && body.roast.id) || ''));
      return jsonResponse({ ok: true });
    }

    if (action === 'resetAll') {
      clearDataRows(SHEETS.beans.name);
      clearDataRows(SHEETS.roasts.name);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'Unknown POST action: ' + action });
  } catch (error) {
    return jsonResponse({ ok: false, error: errorMessage(error) });
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {
      // The lock may not have been acquired if waitLock failed.
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

function ensureSheet(sheetName, desiredHeaders) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const lastColumn = Math.max(1, sheet.getLastColumn());
  let currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function(value) { return String(value || '').trim(); });

  if (currentHeaders.length === 1 && currentHeaders[0] === '') {
    sheet.getRange(1, 1, 1, desiredHeaders.length).setValues([desiredHeaders]);
    sheet.setFrozenRows(1);
    return;
  }

  const missingHeaders = desiredHeaders.filter(function(header) {
    return currentHeaders.indexOf(header) === -1;
  });

  if (missingHeaders.length > 0) {
    sheet.getRange(1, currentHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }

  sheet.setFrozenRows(1);
}

function getHeaders(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function(value) { return String(value || '').trim(); });
}

function getRowsAsObjects(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  const headers = getHeaders(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || headers.length === 0) return [];

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
        if (!header) return;
        item[header] = row[index] instanceof Date ? row[index].toISOString().slice(0, 10) : row[index];
      });
      return item;
    });
}

function appendRow(sheetName, item, failIfExists) {
  if (!item.id) throw new Error(sheetName + ' row requires id.');
  if (failIfExists && findRowById(sheetName, item.id) > 0) {
    throw new Error(sheetName + ' id already exists: ' + item.id);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const headers = getHeaders(sheetName);
  sheet.appendRow(headers.map(function(header) {
    return item[header] === undefined || item[header] === null ? '' : item[header];
  }));
}

function upsertRow(sheetName, item) {
  if (!item.id) throw new Error(sheetName + ' row requires id.');
  const rowNumber = findRowById(sheetName, item.id);
  if (rowNumber <= 0) {
    appendRow(sheetName, item, false);
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const headers = getHeaders(sheetName);
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

function clearDataRows(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, Math.max(1, sheet.getLastColumn())).clearContent();
  }
}

function normalizeBean(input) {
  const now = new Date().toISOString();
  const initialWeight = toNumber(firstDefined(input.initialWeight, input.stockWeight));
  const currentWeight = toNumber(firstDefined(input.currentWeight, input.stockWeight, initialWeight));
  return {
    id: String(input.id || ''),
    name: String(input.name || ''),
    country: String(input.country || ''),
    region: String(input.region || ''),
    farm: String(input.farm || ''),
    producer: String(input.producer || ''),
    altitude: toNumber(input.altitude),
    variety: String(input.variety || ''),
    process: String(input.process || 'Washed'),
    cropYear: String(input.cropYear || ''),
    purchaseShop: String(input.purchaseShop || ''),
    purchaseDate: String(input.purchaseDate || ''),
    purchasePrice: toNumber(input.purchasePrice),
    initialWeight: initialWeight,
    currentWeight: currentWeight,
    weightLossPercentage: toNumber(firstDefined(input.weightLossPercentage, 15)),
    notes: String(input.notes || ''),
    photoUrl: String(input.photoUrl || ''),
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
    greenWeight: toNumber(firstDefined(input.greenWeight, input.inputWeight)),
    roastedWeight: toNumber(firstDefined(input.roastedWeight, input.expectedOutputWeight)),
    yellowTime: String(input.yellowTime || ''),
    firstCrackTime: String(input.firstCrackTime || ''),
    dropTime: String(input.dropTime || ''),
    developmentTime: String(input.developmentTime || ''),
    developmentRatio: toNumber(input.developmentRatio),
    lossRatio: toNumber(input.lossRatio),
    status: String(input.status || 'waiting_day7'),
    notes: String(input.notes || ''),
    timelineJson: String(input.timelineJson || '{"steps":[]}'),
    createdAt: String(input.createdAt || now),
    updatedAt: now,
  };
}

function firstDefined() {
  for (let index = 0; index < arguments.length; index += 1) {
    if (arguments[index] !== undefined && arguments[index] !== null && arguments[index] !== '') {
      return arguments[index];
    }
  }
  return '';
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function errorMessage(error) {
  return String(error && error.message ? error.message : error);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
