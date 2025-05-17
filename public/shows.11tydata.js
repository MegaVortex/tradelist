module.exports = {
  pagination: {
    data: "shows",         // 👈 the global array from .eleventy.js
    size: 1,               // 👈 one page per item
    alias: "show"          // 👈 each item will be accessible as `show` in the template
  },
  permalink: data => data.show.permalink,
  layout: "templates/show.njk"
};
