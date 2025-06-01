const extractVariantFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/\/bikes\/[^\/]+\/\d+\/(.+)$/);
  return match ? match[1] : null;
};

console.log('=== Testing extractVariantFromUrl ===');
const testUrls = [
  'https://99spokes.com/bikes/yt/2018/tues-cf-pro-race-mob-edition',
  'https://99spokes.com/bikes/yt/2018/tues-cf-pro',
  'https://99spokes.com/bikes/yt/2018/capra-27-al'
];

testUrls.forEach(url => {
  console.log('URL:', url);
  console.log('Extracted:', extractVariantFromUrl(url));
  console.log();
});

// Test against some JSON variant IDs
const fs = require('fs');
const bikeVariants = JSON.parse(fs.readFileSync('../scrapers/bike_variants.json', 'utf8'));

console.log('=== Comparing JSON variantId vs URL extraction ===');
const ytData = bikeVariants.yt_2018;
if (ytData && ytData.families) {
  ytData.families.slice(0, 1).forEach(family => {
    console.log('Family:', family.familyId);
    family.variants.slice(0, 3).forEach(variant => {
      const extractedFromUrl = extractVariantFromUrl(variant.url);
      console.log('  JSON variantId:     ', variant.variantId);
      console.log('  Extracted from URL: ', extractedFromUrl);
      console.log('  Match:', variant.variantId === extractedFromUrl);
      console.log();
    });
  });
}