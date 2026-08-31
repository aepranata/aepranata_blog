#!/usr/bin/env node
/**
 * build-posts.js
 *
 * Memindai folder ./posts untuk file bernama yyyymmddhhmm.html,
 * membaca metanya (title, excerpt, device, tag), lalu menulis
 * posts.json terurut dari yang terbaru (nama file terbesar dulu).
 *
 * Jalankan setiap kali ada post baru: `node build-posts.js`
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, 'posts');
const OUTPUT_FILE = path.join(__dirname, 'posts.json');
const FILENAME_RE = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})\.html$/;

function extractMeta(html, name) {
  const re = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, 'i');
  const m = html.match(re);
  return m ? m[1] : '';
}

function extractBilingual(html, baseName, fallback) {
  const id = extractMeta(html, `${baseName}-id`) || fallback;
  const en = extractMeta(html, `${baseName}-en`) || id || fallback;
  return { id, en };
}

function build() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`Folder tidak ditemukan: ${POSTS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => FILENAME_RE.test(f));

  if (files.length === 0) {
    console.warn('Tidak ada file post dengan format yyyymmddhhmm.html di folder posts/.');
  }

  // Urutkan berdasarkan nama file — karena formatnya yyyymmddhhmm,
  // urutan string = urutan waktu. Terbaru duluan (descending).
  files.sort((a, b) => b.localeCompare(a));

  const posts = files.map((filename, index) => {
    const match = filename.match(FILENAME_RE);
    const [, yyyy, mm, dd, hh, min] = match;
    const html = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf-8');

    return {
      filename,
      url: `posts/${filename}`,
      timestamp: `${yyyy}${mm}${dd}${hh}${min}`,
      year: parseInt(yyyy, 10),
      monthIndex: parseInt(mm, 10) - 1,
      day: parseInt(dd, 10),
      hour: hh,
      minute: min,
      title: extractBilingual(html, 'title', '(tanpa judul / untitled)'),
      excerpt: extractBilingual(html, 'excerpt', ''),
      tag: extractBilingual(html, 'tag', ''),
      device: extractMeta(html, 'device'),
      tagClass: extractMeta(html, 'tag-class'),
      latest: index === 0,
    };
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  console.log(`✓ ${posts.length} post ditulis ke ${path.relative(process.cwd(), OUTPUT_FILE)}`);
}

build();
