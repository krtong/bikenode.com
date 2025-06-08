module.exports = function(eleventyConfig) {
  // Ignore component files from being processed as pages
  eleventyConfig.ignores.add("src/**/components/**/*.njk");
  eleventyConfig.ignores.add("src/profile/components/**/*.njk");
  eleventyConfig.ignores.add("src/add-bike/components/**/*.njk");
  eleventyConfig.ignores.add("src/dashboard/components/**/*.njk");
  eleventyConfig.ignores.add("src/communities-dashboard/components/**/*.njk");
  eleventyConfig.ignores.add("src/marketplace/components/**/*.njk");
  eleventyConfig.ignores.add("src/route-planner/components/**/*.njk");
  eleventyConfig.ignores.add("src/virtual-garage/components/**/*.njk");
  eleventyConfig.ignores.add("src/virtual-garage-dashboard/components/**/*.njk");
  eleventyConfig.ignores.add("src/rides-dashboard/components/**/*.njk");
  eleventyConfig.ignores.add("src/achievements/components/**/*.njk");
  eleventyConfig.ignores.add("src/sell-item/components/**/*.njk");
  eleventyConfig.ignores.add("src/segments/components/**/*.njk");
  eleventyConfig.ignores.add("src/following/components/**/*.njk");
  eleventyConfig.ignores.add("src/forums/components/**/*.njk");
  
  // Copy static assets
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/documentation/assets");
  
  // Copy component assets for pages with folder structure
  eleventyConfig.addPassthroughCopy("src/route-planner/js");
  eleventyConfig.addPassthroughCopy("src/route-planner/styles");
  
  eleventyConfig.addPassthroughCopy("src/add-bike/js");
  eleventyConfig.addPassthroughCopy("src/add-bike/styles");
  
  eleventyConfig.addPassthroughCopy("src/add-bike-v2/js");
  eleventyConfig.addPassthroughCopy("src/add-bike-v2/styles");
  eleventyConfig.addPassthroughCopy("src/add-bike-v2/fonts");
  
  eleventyConfig.addPassthroughCopy("src/marketplace/js");
  eleventyConfig.addPassthroughCopy("src/marketplace/styles");
  eleventyConfig.addPassthroughCopy("src/marketplace/item-detail/js");
  eleventyConfig.addPassthroughCopy("src/marketplace/item-detail/styles");
  eleventyConfig.addPassthroughCopy("src/marketplace/my-listings/js");
  eleventyConfig.addPassthroughCopy("src/marketplace/my-listings/styles");
  
  eleventyConfig.addPassthroughCopy("src/profile/js");
  eleventyConfig.addPassthroughCopy("src/profile/styles");
  
  eleventyConfig.addPassthroughCopy("src/communities-dashboard/js");
  eleventyConfig.addPassthroughCopy("src/communities-dashboard/styles");
  
  eleventyConfig.addPassthroughCopy("src/dashboard/styles");
  
  eleventyConfig.addPassthroughCopy("src/virtual-garage/styles");
  
  eleventyConfig.addPassthroughCopy("src/virtual-garage-dashboard/js");
  eleventyConfig.addPassthroughCopy("src/virtual-garage-dashboard/styles");
  
  eleventyConfig.addPassthroughCopy("src/rides-dashboard/js");
  eleventyConfig.addPassthroughCopy("src/rides-dashboard/styles");
  
  eleventyConfig.addPassthroughCopy("src/achievements/js");
  eleventyConfig.addPassthroughCopy("src/achievements/styles");
  
  eleventyConfig.addPassthroughCopy("src/gear/js");
  eleventyConfig.addPassthroughCopy("src/gear/styles");
  
  eleventyConfig.addPassthroughCopy("src/sell-item/js");
  eleventyConfig.addPassthroughCopy("src/sell-item/styles");
  
  eleventyConfig.addPassthroughCopy("src/segments/js");
  eleventyConfig.addPassthroughCopy("src/segments/styles");
  
  eleventyConfig.addPassthroughCopy("src/following/js");
  eleventyConfig.addPassthroughCopy("src/following/styles");
  
  // Dashboard V2 assets
  eleventyConfig.addPassthroughCopy("src/dashboard-v2/js");
  eleventyConfig.addPassthroughCopy("src/dashboard-v2/styles");
  eleventyConfig.addPassthroughCopy("src/dashboard-v2/components");
  
  eleventyConfig.addPassthroughCopy("src/profile/js");
  eleventyConfig.addPassthroughCopy("src/profile/styles");
  
  eleventyConfig.addPassthroughCopy("src/forums/js");
  eleventyConfig.addPassthroughCopy("src/forums/styles");
  
  eleventyConfig.addPassthroughCopy("src/gear-collection/js");
  eleventyConfig.addPassthroughCopy("src/gear-collection/styles");
  
  eleventyConfig.addPassthroughCopy("src/gear/js");
  eleventyConfig.addPassthroughCopy("src/gear/styles");
  
  // Copy any additional static files
  eleventyConfig.addPassthroughCopy("*.ico");
  eleventyConfig.addPassthroughCopy("*.png");
  eleventyConfig.addPassthroughCopy("CNAME");
  
  // Set custom directories
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    
    // Use Nunjucks for templating
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"]
  };
};