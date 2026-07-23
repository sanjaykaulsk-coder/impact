import PDFDocument from 'pdfkit';

// pdfkit has no built-in table layout — this is a small, deliberately plain manual table renderer:
// fixed row height, left-aligned cells, automatic page breaks with the header row repeated. Good
// enough for the tabular reports this project needs; not a general-purpose table engine.
export interface TableOptions {
  headers: string[];
  widths: number[];
  rows: (string | number)[][];
  boldLastRow?: boolean;
  rowHeight?: number;
  fontSize?: number;
}

export function drawTable(doc: PDFKit.PDFDocument, opts: TableOptions): void {
  const startX = doc.page.margins.left;
  const rowHeight = opts.rowHeight ?? 16;
  const fontSize = opts.fontSize ?? 8;
  const bottom = doc.page.height - doc.page.margins.bottom;

  const drawRow = (cells: (string | number)[], bold: boolean) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
    let x = startX;
    const y = doc.y;
    cells.forEach((cell, i) => {
      doc.text(String(cell), x, y, { width: opts.widths[i] - 4, ellipsis: true, lineBreak: false });
      x += opts.widths[i];
    });
    doc.y = y + rowHeight;
  };

  const ensureSpace = () => {
    if (doc.y + rowHeight > bottom) {
      doc.addPage();
      drawRow(opts.headers, true);
    }
  };

  drawRow(opts.headers, true);
  opts.rows.forEach((row, i) => {
    ensureSpace();
    drawRow(row, opts.boldLastRow === true && i === opts.rows.length - 1);
  });
}

export function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

export function newReportDoc(): PDFKit.PDFDocument {
  return new PDFDocument({ layout: 'landscape', size: 'A4', margin: 36, bufferPages: true });
}
