module.exports = function(eleventyConfig) {
  // Copy all assets from src structure
  eleventyConfig.addPassthroughCopy("src/**/*.css");
  eleventyConfig.addPassthroughCopy("src/**/*.js");
  eleventyConfig.addPassthroughCopy("src/**/*.jpg");
  eleventyConfig.addPassthroughCopy("src/**/*.jpeg");
  eleventyConfig.addPassthroughCopy("src/**/*.png");
  eleventyConfig.addPassthroughCopy("src/**/*.svg");
  eleventyConfig.addPassthroughCopy("src/**/*.ico");
  eleventyConfig.addPassthroughCopy("src/**/*.gif");
  eleventyConfig.addPassthroughCopy("src/**/*.webp");
  
  // Copy layout CSS files
  eleventyConfig.addPassthroughCopy({"src/_layouts/**/*.css": "_layouts"});
  
  // Copy src/assets to root /assets
  eleventyConfig.addPassthroughCopy({"src/assets": "assets"});
  
  // Copy static images from root assets directory
  eleventyConfig.addPassthroughCopy({"assets/images": "assets/images"});
  
  // Watch for changes
  eleventyConfig.addWatchTarget("src/**/*.css");
  eleventyConfig.addWatchTarget("src/**/*.js");
  
  // Ignore component files that shouldn't be built as pages
  eleventyConfig.ignores.add("src/**/components/**/*.njk");
  eleventyConfig.ignores.add("src/single_file_pages_must_be_converted_to_folders/**/*");
  eleventyConfig.ignores.add("src/**/index-old.njk");
  eleventyConfig.ignores.add("src/deprecated/**/*");
  
  // Remove old index files from build
  eleventyConfig.addGlobalData("eleventyExcludeFromCollections", function() {
    return (data) => {
      return data.page.filePathStem.includes('index-old');
    };
  });
  
  // Add layout alias for folder-based layouts
  eleventyConfig.addLayoutAlias("bikenode-main-layout-01", "bikenode-main-layout-01/index.njk");
  eleventyConfig.addLayoutAlias("bikenode-main-layout-01/index", "bikenode-main-layout-01/index.njk");
  eleventyConfig.addLayoutAlias("front-page-layout", "front-page-layout/index.njk");
  eleventyConfig.addLayoutAlias("front-page-layout/index", "front-page-layout/index.njk");
  eleventyConfig.addLayoutAlias("documentation-page-layout", "documentation-page-layout/index.njk");
  eleventyConfig.addLayoutAlias("authorization-page-layout", "authorization-page-layout/index.njk");
  
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    templateFormats: ["njk", "md", "html", "liquid"]
  };
};