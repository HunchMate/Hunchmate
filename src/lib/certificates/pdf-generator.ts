import { jsPDF } from 'jspdf';
import { CertificateTemplateData, getVerificationUrl } from './renderer';

export interface GeneratePdfOptions {
  templateData: CertificateTemplateData;
  integrityHash: string;
  qrDataUrl?: string;
  issuerName?: string;
  issuerTitle?: string;
  templateType?: 'Classic' | 'Modern' | 'Minimal';
  customConfig?: {
    title?: string;
    subtitle?: string;
    description?: string;
    logoUrl?: string;
    sponsorLogoUrl?: string;
    signatoryName?: string;
    signatoryRole?: string;
  };
}

/**
 * Generate PDF binary buffer / ArrayBuffer for server or client download.
 */
export function generateCertificatePdf(options: GeneratePdfOptions): jsPDF {
  const { 
    templateData, 
    integrityHash, 
    qrDataUrl, 
    issuerName = 'Hunchmate Board', 
    issuerTitle = 'Issuing Authority',
    templateType = 'Classic',
    customConfig = {}
  } = options;

  // Route to appropriate template generator
  switch (templateType) {
    case 'Modern':
      return generateModernTemplate({ templateData, integrityHash, qrDataUrl, issuerName, issuerTitle, customConfig });
    case 'Minimal':
      return generateMinimalTemplate({ templateData, integrityHash, qrDataUrl, issuerName, issuerTitle, customConfig });
    case 'Classic':
    default:
      return generateClassicTemplate({ templateData, integrityHash, qrDataUrl, issuerName, issuerTitle, customConfig });
  }
}

/**
 * Classic Template - Original dark theme with neon accents
 */
function generateClassicTemplate(options: Omit<GeneratePdfOptions, 'templateType'>): jsPDF {
  const { templateData, integrityHash, qrDataUrl, issuerName = 'Hunchmate Board', issuerTitle = 'Issuing Authority' } = options;

  // A4 Landscape dimensions in mm: 297 x 210
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background / Canvas Styling
  doc.setFillColor(10, 15, 30); // Deep midnight dark theme canvas
  doc.rect(0, 0, width, height, 'F');

  // Outer Decorative Border (Cyan/Violet neon vibe)
  doc.setDrawColor(99, 102, 241); // Indigo
  doc.setLineWidth(2);
  doc.rect(8, 8, width - 16, height - 16);

  // Inner Border
  doc.setDrawColor(168, 85, 247); // Purple accent
  doc.setLineWidth(0.8);
  doc.rect(11, 11, width - 22, height - 22);

  // Top Header Banner
  doc.setTextColor(243, 244, 246);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('HUNCHMATE', width / 2, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('VERIFIED DIGITAL CREDENTIAL', width / 2, 34, { align: 'center' });

  // Divider Line
  doc.setDrawColor(75, 85, 99);
  doc.setLineWidth(0.5);
  doc.line(60, 38, width - 60, 38);

  // Certificate Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(236, 72, 153); // Pink accent
  doc.text('CERTIFICATE OF ACHIEVEMENT', width / 2, 50, { align: 'center' });

  // Presentation text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(209, 213, 219);
  doc.text('This is proudly presented to', width / 2, 63, { align: 'center' });

  // Participant Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text(templateData.participantName.toUpperCase(), width / 2, 78, { align: 'center' });

  // Underline participant name
  const nameWidth = doc.getTextWidth(templateData.participantName.toUpperCase());
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.line((width - nameWidth) / 2 - 4, 81, (width + nameWidth) / 2 + 4, 81);

  // Context text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(209, 213, 219);
  doc.text(
    `for outstanding participation and performance in`,
    width / 2,
    93,
    { align: 'center' }
  );

  // Event Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(168, 85, 247);
  doc.text(templateData.eventTitle, width / 2, 106, { align: 'center' });

  // Details row (Issue Date & ID)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text(`Issue Date: ${templateData.issueDate}`, 30, 135);
  doc.text(`Credential ID: ${templateData.certificateId}`, 30, 142);

  // Verification URL
  const verifyUrl = getVerificationUrl(templateData.certificateId);
  doc.text(`Verify URL: ${verifyUrl}`, 30, 149);

  // Embedded QR Code if provided
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', width - 65, 125, 35, 35);
      doc.setFontSize(8);
      doc.text('Scan to Verify', width - 47.5, 164, { align: 'center' });
    } catch (e) {
      console.warn('QR Code embedding failed:', e);
    }
  }

  // Issuer Signatures
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.5);
  doc.line(width / 2 - 30, 152, width / 2 + 30, 152);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(243, 244, 246);
  doc.text(issuerName, width / 2, 158, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text(issuerTitle, width / 2, 163, { align: 'center' });

  // SHA-256 Integrity Hash Security Footer
  doc.setFillColor(17, 24, 39);
  doc.rect(15, height - 25, width - 30, 12, 'F');
  doc.setDrawColor(55, 65, 81);
  doc.rect(15, height - 25, width - 30, 12, 'S');

  doc.setFont('monospace', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(99, 102, 241);
  doc.text('ANTI-TAMPER SHA-256 INTEGRITY HASH:', 20, height - 19);

  doc.setFont('monospace', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(209, 213, 219);
  doc.text(integrityHash, 20, height - 15);

  return doc;
}

/**
 * Modern Template - Clean white background with elegant typography
 */
function generateModernTemplate(options: Omit<GeneratePdfOptions, 'templateType'>): jsPDF {
  const { templateData, integrityHash, qrDataUrl, issuerName = 'Hunchmate Board', issuerTitle = 'Issuing Authority', customConfig } = options;
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Clean white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');

  // Elegant border
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(3);
  doc.rect(10, 10, width - 20, height - 20);

  // Inner accent border
  doc.setDrawColor(147, 51, 234);
  doc.setLineWidth(1);
  doc.rect(15, 15, width - 30, height - 30);

  // Header with custom title
  doc.setTextColor(79, 70, 229);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(customConfig?.title || 'CERTIFICATE OF ACHIEVEMENT', width / 2, 35, { align: 'center' });

  // Subtitle
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(customConfig?.subtitle || 'This certificate is proudly presented to', width / 2, 48, { align: 'center' });

  // Participant name
  doc.setTextColor(17, 24, 39);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(32);
  doc.text(templateData.participantName, width / 2, 70, { align: 'center' });

  // Description
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(customConfig?.description || 'for successfully completing', width / 2, 85, { align: 'center' });

  // Event title
  doc.setTextColor(79, 70, 229);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(templateData.eventTitle, width / 2, 98, { align: 'center' });

  // Footer details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Issue Date: ${templateData.issueDate}`, 30, 140);
  doc.text(`Certificate ID: ${templateData.certificateId}`, 30, 148);

  // QR code
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', width - 55, 125, 40, 40);
      doc.setFontSize(8);
      doc.text('Scan to Verify', width - 35, 170, { align: 'center' });
    } catch (e) {
      console.warn('QR Code embedding failed:', e);
    }
  }

  // Signature
  doc.setDrawColor(107, 114, 128);
  doc.setLineWidth(0.5);
  doc.line(width / 2 - 40, 155, width / 2 + 40, 155);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text(customConfig?.signatoryName || issuerName, width / 2, 162, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(customConfig?.signatoryRole || issuerTitle, width / 2, 168, { align: 'center' });

  // Integrity hash
  doc.setFillColor(249, 250, 251);
  doc.rect(15, height - 20, width - 30, 12, 'F');
  doc.setDrawColor(209, 213, 219);
  doc.rect(15, height - 20, width - 30, 12, 'S');

  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(79, 70, 229);
  doc.text('INTEGRITY HASH:', 20, height - 15);

  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(integrityHash, 20, height - 11);

  return doc;
}

/**
 * Minimal Template - Simple black and white design
 */
function generateMinimalTemplate(options: Omit<GeneratePdfOptions, 'templateType'>): jsPDF {
  const { templateData, integrityHash, qrDataUrl, issuerName = 'Hunchmate Board', issuerTitle = 'Issuing Authority', customConfig } = options;
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Pure white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');

  // Simple black border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(15, 15, width - 30, height - 30);

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(customConfig?.title || 'CERTIFICATE', width / 2, 40, { align: 'center' });

  // Presented to
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(customConfig?.subtitle || 'Presented to', width / 2, 55, { align: 'center' });

  // Name
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.text(templateData.participantName, width / 2, 75, { align: 'center' });

  // For completing
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(customConfig?.description || 'For completing', width / 2, 90, { align: 'center' });

  // Event
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(templateData.eventTitle, width / 2, 105, { align: 'center' });

  // Date and ID
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(64, 64, 64);
  doc.text(`Date: ${templateData.issueDate}`, 30, 145);
  doc.text(`ID: ${templateData.certificateId}`, 30, 152);

  // QR
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', width - 50, 130, 35, 35);
    } catch (e) {
      console.warn('QR Code embedding failed:', e);
    }
  }

  // Signature line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(width / 2 - 35, 160, width / 2 + 35, 160);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(customConfig?.signatoryName || issuerName, width / 2, 167, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(64, 64, 64);
  doc.text(customConfig?.signatoryRole || issuerTitle, width / 2, 173, { align: 'center' });

  // Hash
  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(128, 128, 128);
  doc.text(integrityHash, width / 2, height - 15, { align: 'center' });

  return doc;
}
