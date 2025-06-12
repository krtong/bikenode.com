#\!/bin/bash
# Fix incorrect layout references
find src -name "*.njk" -type f -exec sed -i '' 's/layout: bikenode-main-layout-01\/bikenode-main-layout-01/layout: bikenode-main-layout-01/g' {} \;
find src -name "*.njk" -type f -exec sed -i '' 's/layout: documentation-page-layout\/documentation-page-layout/layout: documentation-page-layout/g' {} \;
find src -name "*.njk" -type f -exec sed -i '' 's/layout: authorization-page-layout\/authorization-page-layout/layout: authorization-page-layout/g' {} \;
find src -name "*.njk" -type f -exec sed -i '' 's/layout: front-page-layout\/front-page-layout/layout: front-page-layout/g' {} \;
echo "Fixed layout references"
