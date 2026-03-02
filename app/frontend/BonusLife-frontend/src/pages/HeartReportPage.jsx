import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Heart, ArrowLeft, Download, Share2, Loader2 } from 'lucide-react';
import { ROUTES } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { buildAndDownloadSignedHeartPDF } from '../utils/assessmentPdf';

const getRiskBadgeClasses = (riskLevel) => {
  const r = (riskLevel || '').toLowerCase();
  if (r.includes('low') || r.includes('minimal')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (r.includes('medium') || r.includes('moderate')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (r.includes('high') || r.includes('elevated')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-white/[0.08] text-gray-300 border-white/[0.12]';
};

export default function HeartReportPage({ language }) {
  const isTr = language === 'turkish';
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const assessment = location.state?.assessment;

  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareLink, setShareLink] = useState(null);

  const handleDownloadPDF = async () => {
    if (!assessment) return;
    setPdfLoading(true);
    try {
      await buildAndDownloadSignedHeartPDF(assessment, user, isTr, apiService);
    } catch (err) {
      const msg = err.message || '';
      const is404 = msg.includes('404');
      const friendly = is404
        ? (isTr ? 'PDF imzalama servisi bulunamadı (404). Backend çalışıyor mu?' : 'PDF signing service not found (404). Is the backend running?')
        : (msg || (isTr ? 'PDF oluşturulamadı.' : 'Could not create PDF.'));
      alert(friendly);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShare = async () => {
    if (!assessment) return;
    setShareLoading(true);
    try {
      const result = await apiService.shareHeartAssessment(assessment.id);
      const link = `${window.location.origin}/shared/heart/${result.share_token}`;
      setShareLink({ id: assessment.id, link });
      navigator.clipboard?.writeText(link);
    } catch (err) {
      alert(err.message);
    } finally {
      setShareLoading(false);
    }
  };

  const backToHeartAssessments = () => {
    navigate(`${ROUTES.DASHBOARD}?tab=assessments&type=heart`);
  };

  if (!assessment) {
    return (
      <div className="max-w-2xl mx-auto px-6 pt-32 pb-24">
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center">
          <p className="text-gray-400 mb-4">{isTr ? 'Kalp değerlendirmesi bulunamadı.' : 'Heart assessment not found.'}</p>
          <Link
            to={`${ROUTES.DASHBOARD}?tab=assessments&type=heart`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 border border-pink-500/30 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {isTr ? 'Kalp değerlendirmelerime dön' : 'Back to My Heart Assessments'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 pt-32 pb-24">
      <div className="mb-6">
        <button
          type="button"
          onClick={backToHeartAssessments}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition focus:outline-none focus:ring-2 focus:ring-pink-500/50"
        >
          <ArrowLeft className="w-4 h-4" />
          {isTr ? 'Kalp değerlendirmelerime dön' : 'Back to My Heart Assessments'}
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/[0.06]">
          <div className="w-11 h-11 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              {isTr ? 'Kalp Değerlendirme Raporu' : 'Heart Assessment Report'}
            </h1>
            <p className="text-xs text-gray-500">{isTr ? 'Hasta' : 'Patient'}: {user?.full_name || user?.email || 'N/A'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-gray-500 mb-1">{isTr ? 'Risk Seviyesi' : 'Risk Level'}</p>
              <span className={`inline-block px-2 py-1 rounded text-sm font-bold ${getRiskBadgeClasses(assessment.risk_level)}`}>
                {assessment.risk_level || 'Unknown'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-gray-500 mb-1">{isTr ? 'Olasılık' : 'Probability'}</p>
              <p className="text-lg font-bold text-white">
                {assessment.probability != null ? `${(assessment.probability * 100).toFixed(1)}%` : 'N/A'}
              </p>
            </div>
          </div>

          {assessment.executive_summary && (
            <div>
              <p className="text-xs text-gray-500 mb-2">{isTr ? 'Özet' : 'Summary'}</p>
              <div className="text-sm text-gray-300 leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-100">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className="ml-1">{children}</li>,
                  }}
                >
                  {assessment.executive_summary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {assessment.created_at && (
            <p className="text-xs text-gray-500">{isTr ? 'Tarih' : 'Date'}: {new Date(assessment.created_at).toLocaleString()}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-white/[0.05] text-gray-400 hover:text-pink-400 border border-white/[0.08] transition focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-50"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isTr ? 'PDF İndir' : 'Download PDF'}
            </button>
            <button
              onClick={handleShare}
              disabled={shareLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-white/[0.05] text-gray-400 hover:text-pink-400 border border-white/[0.08] transition focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-50"
            >
              {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              {isTr ? 'Doktora Paylaş' : 'Share with Doctor'}
            </button>
          </div>

          {shareLink?.id === assessment.id && (
            <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <p className="text-xs text-pink-400">{isTr ? 'Link kopyalandı:' : 'Link copied:'}</p>
              <p className="text-xs text-pink-300 break-all mt-1">{shareLink.link}</p>
            </div>
          )}

          <div className="pt-3 border-t border-white/[0.06]">
            <p className="text-[10px] text-gray-600">{isTr ? 'Bu bir tıbbi teşhis değildir. Sağlık hizmeti sağlayıcınıza danışın.' : 'This is not a medical diagnosis. Please consult your healthcare provider.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
