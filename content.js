function extractJobInfo() {
  let jobInfo = {
      companyName: '',
      positionTitle: '',
      category: '',
      location: '',
      salary: '',
      jobLink: window.location.href
  };

  // Get all text content from the page
  const pageText = document.body.innerText;
  
  // Common keywords for each field
  const keywordPatterns = {
      company: [
          /company:\s*([^\n]+)/i,
          /employer:\s*([^\n]+)/i,
          /organization:\s*([^\n]+)/i,
          /at\s+([\w\s&.,-]+(?:Inc\.|LLC|Ltd\.|Corp\.)?)/i,
          /join\s+([\w\s&.,-]+(?:Inc\.|LLC|Ltd\.|Corp\.)?)/i
      ],
      position: [
          /position:\s*([^\n]+)/i,
          /job title:\s*([^\n]+)/i,
          /role:\s*([^\n]+)/i,
          /([\w\s]+intern(?:ship)?[\w\s]*)/i,
          /([\w\s]+analyst[\w\s]*)/i,
          /([\w\s]+engineer[\w\s]*)/i,
          /([\w\s]+developer[\w\s]*)/i
      ],
      location: [
          /location:\s*([^\n]+)/i,
          /based in:\s*([^\n]+)/i,
          /where:\s*([^\n]+)/i,
          /workplace:\s*([^\n]+)/i,
          /(?:remote|hybrid|on-site|in-person)(?:\s+in\s+)([\w\s,]+)/i,
          /(?:position|job)\s+(?:is|located)\s+in\s+([\w\s,]+)/i
      ],
      salary: [
          /salary:\s*([\$€£]?[\d,.]+(k|,000)?(?:\s*-\s*[\$€£]?[\d,.]+(k|,000)?)?\s*(?:per\s+(?:year|month|week|hr|hour))?)/i,
          /compensation:\s*([\$€£]?[\d,.]+(k|,000)?(?:\s*-\s*[\$€£]?[\d,.]+(k|,000)?)?\s*(?:per\s+(?:year|month|week|hr|hour))?)/i,
          /pay:\s*([\$€£]?[\d,.]+(k|,000)?(?:\s*-\s*[\$€£]?[\d,.]+(k|,000)?)?\s*(?:per\s+(?:year|month|week|hr|hour))?)/i,
          /stipend:\s*([\$€£]?[\d,.]+(k|,000)?(?:\s*-\s*[\$€£]?[\d,.]+(k|,000)?)?\s*(?:per\s+(?:year|month|week|hr|hour))?)/i,
          /([\$€£]?[\d,.]+(k|,000)?(?:\s*-\s*[\$€£]?[\d,.]+(k|,000)?)?\s*(?:per\s+(?:year|month|week|hr|hour)))/i
      ]
  };

  // Try to find information using patterns
  for (const [field, patterns] of Object.entries(keywordPatterns)) {
      for (const pattern of patterns) {
          const match = pageText.match(pattern);
          if (match && match[1]) {
              const value = match[1].trim();
              if (value && value.length < 100) { // Sanity check for length
                  switch(field) {
                      case 'company':
                          jobInfo.companyName = value;
                          break;
                      case 'position':
                          jobInfo.positionTitle = value;
                          break;
                      case 'location':
                          jobInfo.location = value;
                          break;
                      case 'salary':
                          jobInfo.salary = value;
                          break;
                  }
                  break; // Stop after first valid match for this field
              }
          }
      }
  }

  // Fallback to common HTML elements if pattern matching failed
  if (!jobInfo.companyName) jobInfo.companyName = findByCommonSelectors('company');
  if (!jobInfo.positionTitle) jobInfo.positionTitle = findByCommonSelectors('position');
  if (!jobInfo.location) jobInfo.location = findByCommonSelectors('location');
  if (!jobInfo.salary) jobInfo.salary = findByCommonSelectors('salary');

  // Determine category based on position title
  if (jobInfo.positionTitle) {
      jobInfo.category = determineCategory(jobInfo.positionTitle);
  }

  // Clean up extracted data
  for (let key in jobInfo) {
      if (typeof jobInfo[key] === 'string') {
          // Remove extra whitespace and common unwanted characters
          jobInfo[key] = jobInfo[key].replace(/\\n/g, ' ')
                                   .replace(/\s+/g, ' ')
                                   .trim();
      }
  }

  return jobInfo;
}

function findByCommonSelectors(type) {
  const selectors = {
      company: [
          '[class*="company"]',
          '[class*="employer"]',
          '[class*="organization"]',
          'meta[property="og:site_name"]',
          'meta[property="og:title"]',
          '[class*="logo"]',
          '[class*="brand"]'
      ],
      position: [
          'h1',
          '[class*="title"]',
          '[class*="position"]',
          '[class*="role"]',
          '[class*="job"]',
          'meta[property="og:title"]'
      ],
      location: [
          '[class*="location"]',
          '[class*="address"]',
          '[class*="where"]',
          '[class*="place"]'
      ],
      salary: [
          '[class*="salary"]',
          '[class*="compensation"]',
          '[class*="pay"]',
          '[class*="stipend"]'
      ]
  };

  for (const selector of selectors[type]) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
          const text = element.textContent || element.getAttribute('content');
          if (text && text.trim() && text.length < 100) {
              return text.trim();
          }
      }
  }
  return '';
}

function determineCategory(title) {
  const title_lower = title.toLowerCase();
  
  const categories = {
      'Software Engineering': ['software', 'full stack', 'frontend', 'backend', 'developer', 'engineer', 'swe', 'programming', 'mobile', 'web', 'java', 'python', 'react', 'node', 'devops', 'cloud'],
      'Data Science': ['data', 'machine learning', 'analytics', 'ml', 'artificial intelligence', 'ai', 'statistics', 'analyst', 'business intelligence', 'bi', 'database', 'sql'],
      'Cybersecurity': ['security', 'cyber', 'information security', 'infosec', 'penetration', 'security engineer', 'network security', 'cryptography', 'risk', 'compliance']
  };

  for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => title_lower.includes(keyword))) {
          return category;
      }
  }
  
  return 'Other';
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobInfo') {
      const jobInfo = extractJobInfo();
      sendResponse(jobInfo);
  }
});