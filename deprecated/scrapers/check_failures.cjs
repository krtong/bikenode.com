const fs = require('fs');
const data = JSON.parse(fs.readFileSync('comprehensive_bike_specs_backup_2025-05-29T10-57-35-065Z_session_start.json', 'utf8'));

console.log('Checking all failed variants from our test:');
const failedIds = ['520', '920', '1120'];

failedIds.forEach(id => {
  console.log('\nVariant ' + id + ':');
  const variant = data[id];
  if (variant) {
    console.log('  name: ' + variant.name);
    console.log('  url: ' + variant.url);
    console.log('  comprehensiveData.extractionSuccess: ' + variant.comprehensiveData?.extractionSuccess);
    console.log('  comprehensiveData.error: ' + variant.comprehensiveData?.error);
    console.log('  comprehensiveData.errorType: ' + variant.comprehensiveData?.errorType);
    console.log('  pageInfo exists: ' + !!variant.comprehensiveData?.pageInfo);
    if (variant.comprehensiveData?.pageInfo) {
      console.log('  pageInfo.title: ' + variant.comprehensiveData.pageInfo.title);
    }
  } else {
    console.log('  Variant not found in data');
  }
});