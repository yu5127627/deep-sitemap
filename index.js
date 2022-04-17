const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");

// 去重复
function noRepeatMap (list) {
  return [...new Set(list)];
}

class SiteMap {
  constructor (url) {
    this.url = url;
    this.origin = ""; // https://blog.ukode.cn
    this.protocol = ""; // https or http
    this.outUrls = [];
    this.urlInit(url);
  }

  urlInit (url) {
    const { origin, protocol } = new URL(url);
    this.origin = origin;
    this.protocol = protocol;
  }

  async requestUrl (url) {
    try {
      const result = await axios.get(url || this.url, { responseType: "arraybuffer" });
      const decoder = new TextDecoder("utf8");
      const html = decoder.decode(result.data);
      const $ = cheerio.load(html);
      const arr = [];
      $("a").each((i, item) => {
        const url = $(item).attr("href");
        if (url && this.resolveUrl(url)) {
          arr.push(this.resolveUrl(url));
        };
      });
      return [...noRepeatMap(arr), ...this.outUrls];
    } catch (error) {

    }
  }

  // url 优化
  resolveUrl (url) {
    let result = "";
    if (url.includes("http") || url.includes("https")) {
      this.outUrls.push(url);
      result = null;
    } else if (url.slice(0, 2) === "//") {
      result = this.protocol + url;
    } else if (url.slice(0, 1) === "/") {
      result = this.origin + url;
    }
    return result ? decodeURIComponent(result) : result;
  }

  createXml (list) {
    const headStr = `<?xml version="1.0" encoding="utf-8"?>\n
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;
    const endStr = "\n</urlset>";
    let tempXml = "";
    for (const item of list) {
      tempXml += `\n  <url>\n    <loc>${item}</loc>\n    <priority>1.00</priority>\n  </url>\n`;
    }
    fs.writeFileSync("./sitemap.xml", headStr + tempXml + endStr);
  }
}

setTimeout(async () => {
  const siteMap = new SiteMap("https://blog.ukode.cn/ssr/cms/home");
  const arr = await siteMap.requestUrl("https://blog.ukode.cn/ssr/cms/home");
  const list = [];
  for (const item of arr) {
    // if (item.includes("ssr")) {
    const temp = await siteMap.requestUrl(item);
    if (temp) {
      list.push(...temp);
    }
    // }
  }
  const result = noRepeatMap(list);
  siteMap.createXml(result);
  console.log(result);
}, 100);
