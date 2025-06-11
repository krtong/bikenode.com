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
  
  // Configure URL structure to flatten nested directories
  eleventyConfig.addGlobalData("permalink", function() {
    return (data) => {
      // Ignore old files
      if (data.page.filePathStem.includes('index-old')) {
        return false;
      }
      // Special handling for front-page
      if (data.page.filePathStem.includes('/front-page/index')) {
        return '/';
      }
      // For category/page-name structure, extract just the page name
      const match = data.page.filePathStem.match(/\/([\w-]+)\/([\w-]+)\/index$/);
      if (match) {
        const category = match[1];
        const pageName = match[2];
        
        // Handle conflicts by keeping category prefix for duplicates
        if (pageName === 'equipment' && category === 'gear') {
          return '/gear-equipment/';
        }
        if (pageName === 'equipment' && category === 'bikes') {
          return '/bikes-equipment/';
        }
        
        // For pages with specific hyphenated names, use just the page name
        if (pageName.includes('-')) {
          return `/${pageName}/`;
        }
        
        // For generic names, include category
        return `/${category}-${pageName}/`;
      }
      // Default behavior
      return data.page.filePathStem + '/';
    };
  });
  
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