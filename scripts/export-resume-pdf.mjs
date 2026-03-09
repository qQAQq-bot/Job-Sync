import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const outputPath = process.argv[2];
  if (!outputPath) {
    throw new Error('missing output path');
  }

  const html = await readStdin();
  if (!html.trim()) {
    throw new Error('empty html payload');
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath || undefined,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '16mm',
        right: '14mm',
        bottom: '16mm',
        left: '14mm',
      },
    });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
