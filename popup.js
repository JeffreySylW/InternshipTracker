// Function to set status message
function setStatus(message, type) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = type;
      setTimeout(() => {
          statusElement.textContent = '';
          statusElement.className = '';
      }, 3000);
  }
}

// Function to add job to spreadsheet
async function addToSheet(jobInfo) {
  try {
      const token = await new Promise((resolve, reject) => {
          chrome.identity.getAuthToken({ interactive: true }, token => {
              if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
              } else {
                  resolve(token);
              }
          });
      });

      const { spreadsheetId } = await chrome.storage.local.get('spreadsheetId');
      
      // First, get the last row number
      const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:J`,
          {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          }
      );

      const data = await response.json();
      const nextRow = (data.values?.length || 0) + 1;

      // Add row to spreadsheet with new "Process" column
      const appendResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A${nextRow}:J${nextRow}?valueInputOption=USER_ENTERED`,
          {
              method: 'PUT',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  range: `A${nextRow}:J${nextRow}`,
                  values: [[
                      jobInfo.companyName,
                      jobInfo.positionTitle,
                      jobInfo.category,
                      new Date().toLocaleDateString(), // Application Date
                      jobInfo.location,
                      jobInfo.salary,
                      jobInfo.jobLink,
                      'Applied',  // Process (default to Applied)
                      '',  // Notes
                      new Date().toLocaleDateString() // Last Updated
                  ]]
              })
          }
      );

      if (!appendResponse.ok) {
          throw new Error('Failed to add row to spreadsheet');
      }

      return true;
  } catch (error) {
      console.error('Error adding to sheet:', error);
      throw error;
  }
}

// Function to clear form
function clearForm() {
  const elements = ['companyName', 'positionTitle', 'category', 'location', 'salary'];
  elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
          if (element.tagName === 'SELECT') {
              element.value = 'Software Engineering';
          } else {
              element.value = '';
          }
      }
  });
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Try to extract job info from the page
      chrome.tabs.sendMessage(tab.id, { action: 'extractJobInfo' }, (jobInfo) => {
          if (!chrome.runtime.lastError && jobInfo) {
              // Pre-fill the form with extracted information
              const elements = {
                  'companyName': jobInfo.companyName,
                  'positionTitle': jobInfo.positionTitle,
                  'location': jobInfo.location,
                  'salary': jobInfo.salary
              };

              Object.entries(elements).forEach(([id, value]) => {
                  const element = document.getElementById(id);
                  if (element && value) {
                      element.value = value;
                  }
              });
              
              if (jobInfo.category) {
                  const categoryElement = document.getElementById('category');
                  if (categoryElement) {
                      categoryElement.value = jobInfo.category;
                  }
              }
          }
      });

      // Add click event listener for the add button
      const addButton = document.getElementById('addJob');
      if (addButton) {
          addButton.addEventListener('click', async () => {
              const jobInfo = {
                  companyName: document.getElementById('companyName')?.value || '',
                  positionTitle: document.getElementById('positionTitle')?.value || '',
                  category: document.getElementById('category')?.value || 'Software Engineering',
                  location: document.getElementById('location')?.value || '',
                  salary: document.getElementById('salary')?.value || '',
                  jobLink: tab.url
              };

              if (!jobInfo.companyName || !jobInfo.positionTitle) {
                  setStatus('Please fill in company name and position title', 'error');
                  return;
              }

              try {
                  await addToSheet(jobInfo);
                  setStatus('Job added successfully!', 'success');
                  clearForm();
              } catch (error) {
                  setStatus('Error adding job: ' + error.message, 'error');
              }
          });
      }
  } catch (error) {
      console.error('Error in popup initialization:', error);
      setStatus('Error initializing popup: ' + error.message, 'error');
  }
});