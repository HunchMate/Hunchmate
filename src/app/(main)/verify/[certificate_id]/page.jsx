'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  Share2, 
  LoaderCircle, 
  CheckCircle2, 
  ArrowLeft,
  ExternalLink,
  Copy
} from 'lucide-react';
import { IconBrandLinkedin } from '@tabler/icons-react';
import CertificateView from '@/components/certificates/CertificateView';
import { trackAnalyticsEvent } from '@/lib/supabase-data';

export default function PublicVerifyCertificatePage() {
  const params = useParams();
  const certificateId = params?.certificate_id;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!certificateId) return;

    async function fetchVerification() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/certificates/verify/${encodeURIComponent(certificateId)}`);
        const json = await res.json();
        if (!res.ok && !json.certificate) {
          setError(json.message || 'Certificate not found');
        } else {
          setData(json);
        }
      } catch (err) {
        console.error('Verification fetch error:', err);
        setError('Failed to connect to verification service.');
      } finally {
        setLoading(false);
      }
    }

    fetchVerification();
  }, [certificateId]);

  const handleDownloadPdf = () => {
    if (!certificateId) return;
    window.open(`/api/certificates/${encodeURIComponent(certificateId)}?format=pdf`, '_blank');
    trackAnalyticsEvent('certificate_download', data?.certificate?.eventId, { certificateId });
  };

  const handleShareCopy = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackAnalyticsEvent('certificate_share', data?.certificate?.eventId, { certificateId, type: 'copy_link' });
  };

  const getLinkedInUrl = () => {
    if (!data?.certificate) return '#';
    const { participantName, eventTitle, organizationName, issueDate, id } = data.certificate;
    const dateObj = issueDate ? new Date(issueDate) : new Date();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    const certUrl = typeof window !== 'undefined' ? window.location.href : '';

    return `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
      `Certificate of Achievement - ${eventTitle}`
    )}&organizationName=${encodeURIComponent(
      organizationName || 'Hunchmate'
    )}&issueMonth=${month}&issueYear=${year}&certUrl=${encodeURIComponent(certUrl)}&certId=${encodeURIComponent(id)}`;
  };

  const handleLinkedInShare = () => {
    trackAnalyticsEvent('certificate_share', data?.certificate?.eventId, { certificateId, type: 'linkedin' });
    window.open(getLinkedInUrl(), '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Link 
            href="/events" 
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Platform
          </Link>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Hunchmate Credential Integrity Verification</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center space-y-4">
            <LoaderCircle className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
            <p className="text-slate-400 text-sm font-medium">Validating credential integrity on ledger...</p>
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && error && (
          <div className="py-16 px-6 max-w-lg mx-auto bg-slate-900 border border-rose-500/30 rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Certificate Not Found</h2>
            <p className="text-sm text-slate-400">{error}</p>
            <div className="pt-2">
              <Link 
                href="/events"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
              >
                Browse Hackathons
              </Link>
            </div>
          </div>
        )}

        {/* Valid Certificate Display */}
        {!loading && data?.certificate && (
          <div className="space-y-8">
            <CertificateView 
              certificate={data.certificate} 
              onDownloadPdf={handleDownloadPdf}
              verificationData={data}
            />

            {/* Action Bar */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="text-center sm:text-left">
                <div className="text-sm font-semibold text-white">Share & Export Credential</div>
                <div className="text-xs text-slate-400">Download printable PDF or add verified badge to your LinkedIn profile.</div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
                {/* Instant PDF Download */}
                <button
                  onClick={handleDownloadPdf}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>

                {/* Add to LinkedIn Profile */}
                <button
                  onClick={handleLinkedInShare}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A66C2] hover:bg-[#084e96] text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
                >
                  <IconBrandLinkedin className="w-4 h-4" />
                  Add to LinkedIn
                </button>

                {/* Copy Shareable Link */}
                <button
                  onClick={handleShareCopy}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition-all"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Link Copied' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
