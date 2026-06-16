import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer-core';
import {
  buildClinicalReportHtml,
  type ClinicalReportPdfData,
} from './templates/clinical-report.template';
import { buildInvoiceHtml, type InvoicePdfData } from './templates/invoice.template';

export type { ClinicalReportPdfData, InvoicePdfData };

@Injectable()
export class PdfService {
  constructor(private config: ConfigService) {}

  private getExecutablePath(): string {
    const path = this.config.get<string>('CHROMIUM_EXECUTABLE_PATH');
    if (!path) {
      throw new ServiceUnavailableException(
        'PDF generation is not available — CHROMIUM_EXECUTABLE_PATH is not configured.',
      );
    }
    return path;
  }

  private async renderHtmlToPdf(html: string): Promise<Buffer> {
    const executablePath = this.getExecutablePath();
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

  async generateClinicalReportPdf(data: ClinicalReportPdfData): Promise<Buffer> {
    const html = buildClinicalReportHtml(data);
    return this.renderHtmlToPdf(html);
  }

  async generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
    const html = buildInvoiceHtml(data);
    return this.renderHtmlToPdf(html);
  }
}
