export interface ClinicalReportPdfData {
  report: {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  };
  patient: {
    firstName: string;
    lastName: string;
    mrn: string;
  };
  author: {
    firstName: string;
    lastName: string;
    role: string;
  };
  encounter: {
    startedAt: Date;
  };
  organization: {
    name: string;
    nameAr?: string | null;
  };
  generatedAt: Date;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ar-SY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ASCII-only ISO-style datetime for the technical footer — no locale dependency.
function formatTechnicalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function buildClinicalReportHtml(data: ClinicalReportPdfData): string {
  const orgDisplay = escapeHtml(data.organization.nameAr ?? data.organization.name);
  const patientName = escapeHtml(`${data.patient.firstName} ${data.patient.lastName}`);
  const authorName = escapeHtml(`${data.author.firstName} ${data.author.lastName}`);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(data.report.title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Arial Unicode MS',
                 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.75;
    color: #1a1a1a;
    direction: rtl;
    text-align: right;
  }

  .header {
    border-bottom: 2px solid #1e40af;
    padding-bottom: 12px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .org-name { font-size: 15pt; font-weight: 700; color: #1e40af; }
  .doc-label { font-size: 10pt; color: #6b7280; margin-top: 3px; }
  .header-date { font-size: 9pt; color: #6b7280; text-align: start; }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 20px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 20px;
    font-size: 10pt;
  }
  .meta-item { display: flex; gap: 6px; align-items: baseline; }
  .meta-label { color: #6b7280; white-space: nowrap; }
  .meta-value { font-weight: 600; }

  .report-header { margin-bottom: 16px; }
  .report-title {
    font-size: 14pt;
    font-weight: 700;
    border-inline-start: 4px solid #1e40af;
    padding-inline-start: 10px;
    margin-bottom: 6px;
    unicode-bidi: isolate;
  }
  .status-pill {
    display: inline-block;
    background: #dcfce7;
    color: #15803d;
    font-size: 9pt;
    font-weight: 600;
    padding: 2px 12px;
    border-radius: 12px;
  }

  .content-box {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 24px;
    min-height: 150px;
  }
  .content-text {
    white-space: pre-wrap;
    font-size: 11pt;
    line-height: 1.85;
    unicode-bidi: isolate;
    text-align: start;
  }

  .footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 10px;
    font-size: 9pt;
    color: #9ca3af;
    display: flex;
    justify-content: space-between;
    direction: ltr;
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="org-name">${orgDisplay}</div>
    <div class="doc-label">تقرير سريري — Clinical Report</div>
  </div>
  <div class="header-date">${formatDate(data.report.createdAt)}</div>
</div>

<div class="meta-grid">
  <div class="meta-item">
    <span class="meta-label">المريض:</span>
    <span class="meta-value" dir="auto">${patientName}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">رقم الملف:</span>
    <span class="meta-value" dir="ltr">${escapeHtml(data.patient.mrn)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">الطبيب:</span>
    <span class="meta-value" dir="auto">${authorName}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">تاريخ الزيارة:</span>
    <span class="meta-value">${formatDate(data.encounter.startedAt)}</span>
  </div>
</div>

<div class="report-header">
  <div class="report-title" dir="auto">${escapeHtml(data.report.title)}</div>
  <span class="status-pill">مُعتمد</span>
</div>

<div class="content-box">
  <p class="content-text" dir="auto">${escapeHtml(data.report.content)}</p>
</div>

<div class="footer">
  <span>Generated: ${formatTechnicalDate(data.generatedAt)}</span>
  <span>Report ID: ${escapeHtml(data.report.id)}</span>
</div>

</body>
</html>`;
}
