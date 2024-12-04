// Replace this with your spreadsheet ID from the URL
const SPREADSHEET_ID = '1-ilEQzOESuHDuuKGj8iJ7B0QsAA7Kd_iLSQ_sxvg0is';

// Function to get auth token
function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            resolve(token);
        });
    });
}

// Function to verify spreadsheet access
async function verifySpreadsheetAccess(token, spreadsheetId) {
    try {
        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Could not access spreadsheet');
        }

        return await response.json();
    } catch (error) {
        console.error('Error verifying spreadsheet access:', error);
        throw error;
    }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    // Save spreadsheet ID to chrome storage
    chrome.storage.local.set({ spreadsheetId: SPREADSHEET_ID }, () => {
        console.log('Spreadsheet ID saved');
    });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSpreadsheetId") {
        chrome.storage.local.get('spreadsheetId', (data) => {
            sendResponse({ spreadsheetId: data.spreadsheetId });
        });
        return true;
    }
    
    if (request.action === "verifyAccess") {
        getAuthToken()
            .then(token => verifySpreadsheetAccess(token, SPREADSHEET_ID))
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});