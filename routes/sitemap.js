const express = require("express");
const router = express.Router();
const { Course } = require("../data"); 


router.get("/sitemap.xml", async (req, res) => {
  try {
    const baseUrl = "https://madeformanners.com";
    const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const staticPages = [
      { loc: `${baseUrl}/`, changefreq: "always", priority: "1.00" },
      { loc: `${baseUrl}/home`, changefreq: "always", priority: "1.00" },
      { loc: `${baseUrl}/about`, changefreq: "weekly", priority: "0.80" },
      { loc: `${baseUrl}/contact`, changefreq: "weekly", priority: "0.80" },
      { loc: `${baseUrl}/login`, changefreq: "weekly", priority: "0.90" },
      { loc: `${baseUrl}/register`, changefreq: "weekly", priority: "0.90" },
      { loc: `${baseUrl}/courses`, changefreq: "daily", priority: "1.00" },
      { loc: `${baseUrl}/policy`, changefreq: "monthly", priority: "0.70" }
    ];

  
    const courses = await Course.find({}, { _id: 1, slug: 1 }); 
    const courseUrls = courses.map(course => ({
      loc: `${baseUrl}/courses/${course.slug || course._id}`,
      changefreq: "weekly",
      priority: "0.80"
    }));

    const allUrls = [...staticPages, ...courseUrls];

    // create XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    allUrls.forEach(page => {
      xml += `  <url>\n`;
      xml += `    <loc>${page.loc}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    
    res.header("Content-Type", "application/xml; charset=UTF-8");
    res.send(xml);

  } catch (err) {
    console.error("Error generating sitemap:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
