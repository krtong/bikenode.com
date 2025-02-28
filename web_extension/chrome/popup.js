export function someFunction() {
  // your implementation here
  return 'expected value';
}

document.addEventListener('DOMContentLoaded', function() {
  const convertButton = document.getElementById('convert-button');
  const jsonOutput = document.getElementById('json-output');
  const copyButton = document.getElementById('copy-button');
  const statusMessage = document.getElementById('status-message');
  const jsonContainer = document.querySelector('.json-container');

  // Check if we're on a Craigslist page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    if (!currentUrl.includes('craigslist.org')) {
      statusMessage.textContent = 'Please navigate to a Craigslist post';
      convertButton.disabled = true;
    }
  });

  // Handle convert button click
  convertButton.addEventListener('click', function() {
    statusMessage.textContent = 'Converting...';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'convertToJson'}, function(response) {
        if (response && response.success) {
          statusMessage.textContent = 'Conversion successful!';
          jsonOutput.value = JSON.stringify(response.data, null, 2);
          jsonContainer.style.display = 'flex';
        } else {
          statusMessage.textContent = 'Conversion failed: ' + (response ? response.error : 'Unknown error');
        }
      });
    });
  });

  // Handle copy button click
  copyButton.addEventListener('click', function() {
    jsonOutput.select();
    document.execCommand('copy');
    const originalText = copyButton.textContent;
    copyButton.textContent = 'Copied!';
    setTimeout(() => {
      copyButton.textContent = originalText;
    }, 1500);
  });
});