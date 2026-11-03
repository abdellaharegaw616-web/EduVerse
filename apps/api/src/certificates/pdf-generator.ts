export interface CertificatePdfData {
  id: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  institutionName: string;
  completionDate: string;
  issuedAt: string;
  verificationCode: string;
}

/**
 * Generates an authentic, self-contained PDF 1.4 binary buffer.
 * Renders in landscape A4 (842 x 595 pt) with double borders and official typography.
 */
export function generateCertificatePdf(data: CertificatePdfData): Buffer {
  const sanitize = (text: string) =>
    (text || '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, ' '); // ASCII-safe for Standard 14 PDF fonts

  const student = sanitize(data.studentName);
  const course = sanitize(data.courseTitle);
  const instructor = sanitize(data.instructorName);
  const institution = sanitize(data.institutionName);
  const date = sanitize(data.completionDate);
  const code = sanitize(data.verificationCode);
  const certId = sanitize(data.id);

  // Landscape A4 coordinates: 842 pt width, 595 pt height
  const streamBody = [
    'q',
    // Outer Border (Dark Navy)
    '0.08 0.15 0.30 RG',
    '3 w',
    '25 25 792 545 re S',
    // Inner Border (Gold)
    '0.85 0.65 0.13 RG',
    '1.5 w',
    '32 32 778 531 re S',
    'Q',
    // Header
    'BT',
    '/F1 16 Tf',
    '0.08 0.15 0.30 rg',
    '350 515 Td',
    '(EDUVERSE ACADEMY) Tj',
    'ET',
    'BT',
    '/F2 10 Tf',
    '0.45 0.50 0.60 rg',
    '330 495 Td',
    '(Learn Beyond Boundaries - Ethiopia) Tj',
    'ET',
    // Main Title
    'BT',
    '/F1 26 Tf',
    '0.85 0.65 0.13 rg',
    '220 445 Td',
    '(CERTIFICATE OF COMPLETION) Tj',
    'ET',
    // Recipient Preamble
    'BT',
    '/F2 11 Tf',
    '0.45 0.50 0.60 rg',
    '355 410 Td',
    '(This is proudly awarded to) Tj',
    'ET',
    // Student Name
    'BT',
    '/F1 22 Tf',
    '0.08 0.15 0.30 rg',
    '250 365 Td',
    `(${student}) Tj`,
    'ET',
    // Completion Text
    'BT',
    '/F2 11 Tf',
    '0.45 0.50 0.60 rg',
    '260 325 Td',
    '(for successfully fulfilling all curriculum requirements for) Tj',
    'ET',
    // Course Title
    'BT',
    '/F1 18 Tf',
    '0.08 0.15 0.30 rg',
    '220 285 Td',
    `(${course}) Tj`,
    'ET',
    // Institution / Accreditation
    'BT',
    '/F1 12 Tf',
    '0.10 0.60 0.40 rg',
    '320 250 Td',
    `(${institution}) Tj`,
    'ET',
    // Instructor Signature Section
    'BT',
    '/F1 11 Tf',
    '0.08 0.15 0.30 rg',
    '100 135 Td',
    `(${instructor}) Tj`,
    '0 -14 Td',
    '/F2 9 Tf',
    '0.45 0.50 0.60 rg',
    '(Course Instructor / Department Lead) Tj',
    'ET',
    // Completion Date Section
    'BT',
    '/F1 11 Tf',
    '0.08 0.15 0.30 rg',
    '600 135 Td',
    `(${date}) Tj`,
    '0 -14 Td',
    '/F2 9 Tf',
    '0.45 0.50 0.60 rg',
    '(Date of Completion) Tj',
    'ET',
    // Verification Code & Footer
    'BT',
    '/F1 9 Tf',
    '0.30 0.35 0.40 rg',
    '280 85 Td',
    `(Verification Code: ${code}) Tj`,
    '0 -13 Td',
    `/F2 8 Tf`,
    `(Certificate Identifier: ${certId}) Tj`,
    '0 -13 Td',
    '(Verify authenticity online at: https://eduverse.et/verify) Tj',
    'ET',
  ].join('\n');

  const streamLength = Buffer.byteLength(streamBody, 'utf-8');

  // Build PDF 1.4 Object Structure
  const objects: string[] = [];

  // Obj 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Obj 3: Page (Landscape A4: 842 x 595 pt)
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
  );

  // Obj 4: Content Stream
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamBody}\nendstream\nendobj\n`);

  // Obj 5: Font 1 (Helvetica-Bold)
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  // Obj 6: Font 2 (Helvetica)
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  // Assembly with cross-reference table
  let offset = '%PDF-1.4\n'.length;
  const xrefEntries: string[] = ['0000000000 65535 f \n'];

  for (const obj of objects) {
    xrefEntries.push(`${offset.toString().padStart(10, '0')} 00000 n \n`);
    offset += Buffer.byteLength(obj, 'utf-8');
  }

  const xrefOffset = offset;
  const xref = `xref\n0 ${objects.length + 1}\n${xrefEntries.join('')}`;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(`%PDF-1.4\n${objects.join('')}${xref}${trailer}`, 'utf-8');
}

