# Shop App (HTML + Google Sheets)

This project uses a static HTML file as the frontend and a Google Sheet + Google Apps Script as the backend/database.

## Setup Instructions

### 1. Create Your Google Sheet (Database)
1. Go to **Google Sheets** and create a new sheet.
2. Rename it to **ShopDB**.
3. Add columns: `id`, `product_name`, `quantity`, `price`, `date`.

### 2. Create the Google Apps Script (API)
1. In your Google Sheet, go to **Extensions > Apps Script**.
2. Delete everything and paste the code below:

```javascript
// === CONFIG ===
const SHEET_NAME = "Sheet1";

function doGet(e) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);

  sheet.appendRow([
    new Date().getTime(),      // id (timestamp)
    body.product_name,
    body.quantity,
    body.price,
    new Date().toLocaleString()
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Deploy > New Deployment**.
4. Settings:
   - Type: **Web App**
   - Who can access: **Anyone**
   - Execute as: **Me**
5. Click **Deploy** and copy the **Web App URL**.

### 3. Connect Frontend
1. Open `index.html`.
2. Replace `YOUR_WEB_APP_URL_HERE` with your Web App URL.
# shop-app
