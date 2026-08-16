'use client';

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Award, ShieldCheck, Download, ExternalLink, Calendar, CheckCircle2, AlertTriangle, User, Hash } from 'lucide-react';
import { getVerificationUrl } from '../../lib/certificates/renderer';

export default function CertificateView({ certificate, onDownloadPdf, isVerifying = false, verificationData = null }) {
  const certRef = useRef(null);

  if (!certificate) return null;

  const {
    id,
    participantName = 'Participant Name',
    eventTitle = 'Event Title',
    issueDate,
    status = 'active',
    integrityHash = '',
    issuerName = 'Hunchmate Board',
    organizationName = 'Hunchmate Platform',
    recipientRole = 'Participant',
  } = certificate;

  const verifyUrl = getVerificationUrl(id);
  const formattedDate = issueDate ? new Date(issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  const isActive = status === 'active';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Status Alert Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        isActive 
          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
          : 'bg-rose-950/30 border-rose-500/30 text-rose-400'
      }`}>
        <div className="flex items-center gap-3">
          {isActive ? <ShieldCheck className="w-6 h-6 text-emerald-400" /> : <AlertTriangle className="w-6 h-6 text-rose-400" />}
          <div>
            <div className="font-semibold text-base">
              {isActive ? 'Authentic Credential Verified' : 'Credential Revoked'}
            </div>
            <div className="text-xs opacity-80">
              {isActive ? 'This certificate is authentic and recorded on the Hunchmate ledger.' : 'This certificate has been revoked by the issuing authority.'}
            </div>
          </div>
        </div>

        <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full ${
          isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
        }`}>
          {status}
        </span>
      </div>

      {/* Visual Certificate Container */}
      <div 
        ref={certRef}
        className="relative overflow-hidden rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 p-8 sm:p-12 text-slate-100 shadow-2xl transition-all"
      >
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-indigo-400/80 rounded-tl-2xl m-3" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-indigo-400/80 rounded-tr-2xl m-3" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-indigo-400/80 rounded-bl-2xl m-3" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-indigo-400/80 rounded-br-2xl m-3" />

        {/* Certificate Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium uppercase tracking-widest">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            {organizationName} Official Credential
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-pink-300 to-purple-300 tracking-tight">
            CERTIFICATE OF ACHIEVEMENT
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            THIS IS PROUDLY PRESENTED TO
          </p>
        </div>

        {/* Recipient Name */}
        <div className="my-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-wide border-b-2 border-indigo-500/50 pb-3 inline-block px-8 max-w-full truncate">
            {participantName}
          </h2>
          <p className="mt-3 text-sm text-slate-300 font-light">
            for successfully participating and fulfilling all criteria in
          </p>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-indigo-300 tracking-wide">
            {eventTitle}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-widest mt-1">
            Role: <span className="text-slate-200 font-semibold">{recipientRole}</span>
          </div>
        </div>

        {/* Footer Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end mt-10 pt-6 border-t border-slate-800 relative z-10">
          {/* Issue Date & ID */}
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Issued: {formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <Hash className="w-3.5 h-3.5 text-purple-400" />
              <span>{id}</span>
            </div>
          </div>

          {/* Issuer Signature */}
          <div className="text-center space-y-1">
            <div className="border-b border-slate-700 pb-1 max-w-[180px] mx-auto text-indigo-300 font-serif italic text-base">
              {issuerName}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Authorized Issuer Signature</div>
          </div>

          {/* QR Code Verification */}
          <div className="flex flex-col items-center sm:items-end justify-center">
            <div className="p-2 bg-white rounded-lg shadow-md border border-slate-700">
              <QRCodeSVG value={verifyUrl} size={72} level="H" />
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono text-center sm:text-right">
              Scan to verify authenticity
            </div>
          </div>
        </div>

        {/* Anti-Tamper SHA-256 Integrity Box */}
        {integrityHash && (
          <div className="mt-8 p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-slate-400">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>SHA-256 INTEGRITY HASH:</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-300 break-all select-all font-mono">
              {integrityHash}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
