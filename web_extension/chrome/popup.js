function someFunction() {
  // your implementation here
  return 'expected value';
}

// Make the timer duration configurable to help with testing
const COPY_BUTTON_RESET_DELAY = 1500;

document.addEventListener('DOMContentLoaded', function() {
  const convertButton = document.getElementById('convert-button');
  const jsonOutput = document.getElementById('json-output');
  const copyButton = document.getElementById('copy-button');
  const statusMessage = document.getElementById('status-message');
  const jsonContainer = document.querySelector('.json-container');
  const bikeInfoContainer = document.getElementById('bike-info-container');
  
  // Check if we're on a Craigslist page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    const isCraigslist = currentUrl.includes('craigslist.org');
    
    if (isCraigslist) {
      statusMessage.textContent = "Ready to convert this Craigslist page";
      convertButton.disabled = false;
    } else {
      statusMessage.textContent = "Please navigate to a Craigslist page";
      convertButton.disabled = true;
    }
  });
  
  // Convert button click handler
  convertButton.addEventListener('click', function() {
    statusMessage.textContent = "Processing...";
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      
      chrome.scripting.executeScript({
        target: {tabId: activeTab.id},
        files: ['bikeParser.js', 'content.js']
      }, function() {
        chrome.scripting.executeScript({
          target: {tabId: activeTab.id},
          function: extractData
        }, function(results) {
          if (chrome.runtime.lastError) {
            statusMessage.textContent = "Error: " + chrome.runtime.lastError.message;
            return;
          }
          
          const data = results[0].result;
          jsonOutput.value = JSON.stringify(data, null, 2);
          
          // Update status message based on whether it's a bike listing
          if (data.isBikeListing) {
            statusMessage.textContent = "Bike listing detected! Conversion complete.";
            displayBikeInfo(data);
          } else {
            statusMessage.textContent = "Conversion complete!";
            hideBikeInfo();
          }
        });
      });
    });
  });
  
  // Copy button click handler
  copyButton.addEventListener('click', function() {
    jsonOutput.select();
    document.execCommand('copy');
    statusMessage.textContent = "Copied to clipboard!";
    
    // Reset the button text after a delay
    setTimeout(() => {
      statusMessage.textContent = "Ready to convert";
    }, COPY_BUTTON_RESET_DELAY);
  });
  
  // Function that executes in the context of the webpage
  function extractData() {
    // We'll use the extractCraigslistData function from the injected content script
    return extractCraigslistData();
  }
  
  // Function to display bike-specific information
  function displayBikeInfo(data) {
    if (!bikeInfoContainer) return;
    
    // Show the container
    bikeInfoContainer.style.display = 'block';
    
    // Clear previous content
    bikeInfoContainer.innerHTML = '';
    
    // Add bike-specific fields
    const bikeFields = [
      { label: 'Brand', value: data.brand },
      { label: 'Bike Type', value: data.bikeType },
      { label: 'Frame Size', value: data.frameSize },
      { label: 'Frame Material', value: data.frameMaterial },
      { label: 'Component Group', value: data.componentGroup },
      { label: 'Wheel Size', value: data.wheelSize },
      { label: 'Condition', value: data.condition }
    ];
    
    // Create table for bike details
    const table = document.createElement('table');
    table.className = 'bike-details-table';
    
    bikeFields.forEach(field => {
      if (field.value) {
        const row = document.createElement('tr');
        
        const labelCell = document.createElement('td');
        labelCell.className = 'bike-detail-label';
        labelCell.textContent = field.label;
        
        const valueCell = document.createElement('td');
        valueCell.className = 'bike-detail-value';
        valueCell.textContent = field.value;
        
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        table.appendChild(row);
      }
    });
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = 'Bike Details';
    bikeInfoContainer.appendChild(title);
    
    // Add table if we have any bike details
    if (table.children.length > 0) {
      bikeInfoContainer.appendChild(table);
    } else {
      const noDetails = document.createElement('p');
      noDetails.textContent = 'No specific bike details found.';
      bikeInfoContainer.appendChild(noDetails);
    }
  }
  
  // Function to hide bike info section
  function hideBikeInfo() {
    if (bikeInfoContainer) {
      bikeInfoContainer.style.display = 'none';
    }
  }
});

// Helper function
function resetCopyButtonText(button) {
  button.textContent = 'Copy to Clipboard';
}

// No ES6 module imports/exports in chrome extension scripts