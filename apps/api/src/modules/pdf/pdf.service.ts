import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer-core';
import {
  buildClinicalReportHtml,
  type ClinicalReportPdfData,
} from './templates/clinical-report.template';

export type { ClinicalReportPdfData };

@Injectable()
export class PdfService {
  constructor(private config: ConfigService) {}

  async generateClinicalReportPdf(data: ClinicalReportPdfData): Promise<Buffer> {
    const executablePath = this.config.get<string>('CHROMIUM_EXECUTABLE_PATH');
    if (!executablePath) {
      throw new Error(
        'CHROMIUM_EXECUTABLE_PATH environment variable is required for PDF generation. ' +
        'Set it to your Chromium/Chrome executable path.',
      );
    }

    const html = buildClinicalReportHtml(data);

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
      ],
    });

    try {
      const page = await browser.newPage();
      try {
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        });
        return Buffer.from(pdf);
      } finally {
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
}
