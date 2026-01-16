
/**
 * ÁNH SÁNG STUDIO - SERVER SIDE SCRIPT (Google Apps Script)
 * Spreadsheet ID: 1vPGvx4bUODOEjpbZjDjJVJJtiQ2-4iU9fx-zmJgVMw8
 */

const SPREADSHEET_ID = '1vPGvx4bUODOEjpbZjDjJVJJtiQ2-4iU9fx-zmJgVMw8'; 

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ success: false, error: 'Dữ liệu yêu cầu trống' });
    }

    // Parse JSON từ body (với Content-Type: text/plain nhận được từ frontend)
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const data = request.data;
    const sheetName = request.table;
    const keyField = request.keyField;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. XỬ LÝ ĐĂNG NHẬP
    if (action === 'LOGIN') {
      const staffSheet = ss.getSheetByName('Nhân Viên');
      if (!staffSheet) return createResponse({ success: false, error: 'Không tìm thấy sheet "Nhân Viên"' });
      
      const staffData = staffSheet.getDataRange().getValues();
      const headers = staffData.shift().map(h => h.toString().toLowerCase().trim());
      
      const userIdx = headers.findIndex(h => h === 'username');
      const passIdx = headers.findIndex(h => h === 'password');
      
      const userRow = staffData.find(row => 
        row[userIdx] && row[userIdx].toString().trim().toLowerCase() === request.username.toString().trim().toLowerCase() && 
        row[passIdx] && row[passIdx].toString().trim() === request.password.toString().trim()
      );
      
      if (userRow) {
        const userObj = {};
        const originalHeaders = staffSheet.getDataRange().getValues()[0];
        originalHeaders.forEach((h, i) => {
          let val = userRow[i];
          if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
            try { val = JSON.parse(val); } catch(e) {}
          }
          userObj[h] = val;
        });
        return createResponse({ success: true, action: 'login', data: userObj });
      }
      return createResponse({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    // 2. XỬ LÝ DELETE
    if (action === 'DELETE') {
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) return createResponse({ success: false, error: 'Sheet không tồn tại' });
      
      const headers = sheet.getDataRange().getValues()[0];
      const colIndex = headers.map(h => h.toString().toLowerCase().trim()).indexOf(keyField.toLowerCase().trim());
      
      if (colIndex !== -1) {
        const allValues = sheet.getDataRange().getValues();
        for (let i = 1; i < allValues.length; i++) {
          if (allValues[i][colIndex].toString().trim() == data[keyField].toString().trim()) {
            sheet.deleteRow(i + 1);
            return createResponse({ success: true, action: 'delete', data: { id: data[keyField] } });
          }
        }
      }
      return createResponse({ success: false, error: 'Không tìm thấy bản ghi để xóa' });
    }

    // 3. XỬ LÝ UPSERT (Tạo hoặc Cập nhật)
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      const headers = Object.keys(data);
      sheet.appendRow(headers);
    } else {
      const currentHeaders = sheet.getDataRange().getValues()[0];
      const newKeys = Object.keys(data);
      newKeys.forEach(key => {
        if (!currentHeaders.includes(key)) {
          sheet.getRange(1, currentHeaders.length + 1).setValue(key);
          currentHeaders.push(key);
        }
      });
    }

    const headers = sheet.getDataRange().getValues()[0];
    let rowIndex = -1;
    
    if (keyField) {
      const colIndex = headers.map(h => h.toString().toLowerCase().trim()).indexOf(keyField.toLowerCase().trim());
      if (colIndex !== -1) {
        const allValues = sheet.getDataRange().getValues();
        for (let i = 1; i < allValues.length; i++) {
          if (allValues[i][colIndex].toString().trim() == data[keyField].toString().trim()) {
            rowIndex = i + 1;
            break;
          }
        }
      }
    }

    const rowData = headers.map(header => {
      const val = data[header];
      return (val === undefined || val === null) ? "" : ((typeof val === 'object') ? JSON.stringify(val) : val);
    });

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    return createResponse({ 
      success: true, 
      action: rowIndex > 0 ? 'update' : 'append',
      data: data
    });

  } catch (error) {
    return createResponse({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    if (!e || !e.parameter) return createResponse({ success: false, error: 'Tham số không hợp lệ' });
    
    const table = e.parameter.table;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (table === 'BOOTSTRAP') {
      const payload = {
        contracts: getTableData(ss, 'Contracts'),
        schedules: getTableData(ss, 'LichLamViec'),
        income: getTableData(ss, 'Thu'),
        expense: getTableData(ss, 'Chi'),
        staff: getTableData(ss, 'Nhân Viên'),
        services: getTableData(ss, 'SanPham')
      };
      return createResponse({ success: true, action: 'bootstrap', data: payload });
    }

    return createResponse({ success: true, action: 'read', data: getTableData(ss, table) });
  } catch (e) {
    return createResponse({ success: false, error: e.toString() });
  }
}

function getTableData(ss, tableName) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      obj[h] = val;
    });
    return obj;
  });
}

/**
 * Trả về phản hồi JSON chuẩn cho GAS
 * Không set header custom để tránh trigger preflight của trình duyệt
 */
function createResponse(payload) {
  const output = JSON.stringify(payload);
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}
