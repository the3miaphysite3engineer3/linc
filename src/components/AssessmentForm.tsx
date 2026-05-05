import React, { useState } from 'react';
import { database } from '../firebase';
import { ref, push } from 'firebase/database';
import { motion } from 'motion/react';
import { getStoredTokens, sendGmailEmail } from '../services/gmail';
import PageTitle from './PageTitle';
import { ClipboardList } from 'lucide-react';
import { useI18n } from '../i18n';

const GIFT_SECTIONS = ['A', 'B', 'C', 'D', 'E'] as const;
const GIFT_QUESTIONS: Record<string, string[]> = {
  A: ['A1', 'A2', 'A3', 'A4', 'A5'],
  B: ['B1', 'B2', 'B3', 'B4', 'B5'],
  C: ['C1', 'C2', 'C3', 'C4', 'C5'],
  D: ['D1', 'D2', 'D3', 'D4', 'D5'],
  E: ['E1', 'E2', 'E3', 'E4', 'E5'],
};
const MINISTRY_IDS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'];
const FAITH_IDS = ['q1_1', 'q1_2', 'q1_3', 'q1_4', 'q1_5'];
const VISION_IDS = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'];
const TRAINEE_IDS = ['fullName', 'email', 'surveyDate', 'age', 'attendance', 'currentService', 'workContext', 'arabicFluency', 'englishFluency', 'otherLanguages'];
const REQUIRED_TRAINEE = ['fullName', 'email', 'surveyDate', 'age', 'attendance'];

interface GiftScores {
  A: number; B: number; C: number; D: number; E: number;
}
interface MinistryScores {
  F1: number; F2: number; F3: number; F4: number; F5: number;
  F6: number; F7: number; F8: number; F9: number; F10: number;
}

function getEasternTime(): string {
  return new Date().toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export default function AssessmentForm() {
  const { t, dir } = useI18n();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trainee, setTrainee] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    TRAINEE_IDS.forEach(f => {
      if (f === 'age') init[f] = '18';
      else if (f === 'surveyDate') init[f] = new Date().toISOString().split('T')[0];
      else init[f] = '';
    });
    return init;
  });
  const [faithAnswers, setFaithAnswers] = useState<Record<string, string>>({});
  const [visionAnswers, setVisionAnswers] = useState<Record<string, string>>({});
  const [giftScores, setGiftScores] = useState<Record<string, number>>({});
  const [ministryScores, setMinistryScores] = useState<Record<string, number>>({});

  const calculateGiftScores = (): GiftScores => {
    const scores = {} as GiftScores;
    GIFT_SECTIONS.forEach(key => {
      scores[key] = GIFT_QUESTIONS[key].reduce((sum, qId) => sum + (giftScores[qId] || 0), 0);
    });
    return scores;
  };

  const calculateMinistryScores = (): MinistryScores => {
    const scores = {} as MinistryScores;
    MINISTRY_IDS.forEach(id => {
      scores[id as keyof MinistryScores] = ministryScores[id] || 0;
    });
    return scores;
  };

  const getResults = () => {
    const giftTotals = calculateGiftScores();
    const ministryTotals = calculateMinistryScores();
    const sortedGifts = (Object.entries(giftTotals) as [string, number][]).sort((a, b) => b[1] - a[1]);
    const sortedMinistry = (Object.entries(ministryTotals) as [string, number][]).sort((a, b) => b[1] - a[1]);
    return {
      primaryGift: t(`giftRec.${sortedGifts[0][0]}`),
      secondaryGift: t(`giftRec.${sortedGifts[1][0]}`),
      recommendedMinistry: t(`ministry.${sortedMinistry[0][0]}`),
      summary: `${t('assessment.summaryPrefix')} ${t(`giftRec.${sortedGifts[0][0]}`)}. ${t('assessment.summaryMid')} ${t(`giftRec.${sortedGifts[1][0]}`)}. ${t('assessment.summarySuffix')} ${t(`ministry.${sortedMinistry[0][0]}`)}.`,
      giftTotals,
      ministryTotals,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const allGiftAnswered = GIFT_SECTIONS.every(key =>
      GIFT_QUESTIONS[key].every(q => giftScores[q])
    );
    const allMinistryAnswered = MINISTRY_IDS.every(q => ministryScores[q]);
    const allRequiredTrainee = REQUIRED_TRAINEE.every(f => trainee[f]?.trim());
    const allFaithAnswered = FAITH_IDS.every(q => faithAnswers[q]?.trim());
    const allVisionAnswered = VISION_IDS.slice(0, 5).every(q => visionAnswers[q]?.trim());

    if (!allRequiredTrainee || !allFaithAnswered || !allGiftAnswered || !allMinistryAnswered || !allVisionAnswered) {
      setError(t('assessment.completeFields'));
      return;
    }

    setLoading(true);
    try {
      const giftTotals = calculateGiftScores();
      const ministryTotals = calculateMinistryScores();
      const sortedGifts = (Object.entries(giftTotals) as [string, number][]).sort((a, b) => b[1] - a[1]);
      const sortedMinistry = (Object.entries(ministryTotals) as [string, number][]).sort((a, b) => b[1] - a[1]);
      const submittedAt = getEasternTime();

      const buildSection = (key: string) => ({
        sectionEnglish: t(`gift.${key}.title`),
        sectionArabic: t(`gift.${key}.title`),
        questions: Object.fromEntries(GIFT_QUESTIONS[key].map(qId => [
          qId,
          { questionEnglish: t(`gift.${qId}`), questionArabic: t(`gift.${qId}`), score: giftScores[qId] || 0 }
        ]))
      });

      const fields = {
        trainee: Object.fromEntries(TRAINEE_IDS.map(f => [
          f,
          { fieldEnglish: t(`trainee.${f}`), fieldArabic: t(`trainee.${f}`), value: trainee[f] || '' }
        ])),
        faith: Object.fromEntries(FAITH_IDS.map(qId => [
          qId,
          { questionEnglish: t(`faith.${qId}`), questionArabic: t(`faith.${qId}`), answer: faithAnswers[qId] || '' }
        ])),
        gifts: Object.fromEntries(GIFT_SECTIONS.map(key => [key, buildSection(key)])),
        ministry: Object.fromEntries(MINISTRY_IDS.map(mId => [
          mId,
          { areaEnglish: t(`ministry.${mId}`), areaArabic: t(`ministry.${mId}`), score: ministryScores[mId] || 0 }
        ])),
        vision: Object.fromEntries(VISION_IDS.map(vId => [
          vId,
          { questionEnglish: t(`vision.${vId}`), questionArabic: t(`vision.${vId}`), answer: visionAnswers[vId] || '' }
        ]))
      };

      const results = {
        primaryGift: t(`giftRec.${sortedGifts[0][0]}`),
        secondaryGift: t(`giftRec.${sortedGifts[1][0]}`),
        recommendedMinistry: t(`ministry.${sortedMinistry[0][0]}`),
      };

      const record = {
        tableNameEquivalent: 'form',
        createdAt: Date.now(),
        createdAtISO: new Date().toISOString(),
        createdAtEasternTime: submittedAt,
        interfaceLanguageUsed: dir === 'rtl' ? 'Arabic' : 'English',
        fields,
        scores: { gifts: giftTotals, ministry: ministryTotals },
        results
      };

      await push(ref(database, 'form/'), record);

      const tokens = getStoredTokens();
      if (tokens && trainee.email?.trim()) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f5f4f0; border-radius: 22px;">
            <div style="background: #8b1e1e; color: white; padding: 16px; border-radius: 14px; text-align: center; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 20px;">LINC Spiritual Gifts Assessment</h1>
            </div>
            <p style="color: #333; font-size: 15px;">Dear ${trainee.fullName},</p>
            <p style="color: #555; font-size: 14px;">Thank you for completing the LINC Spiritual Gifts & Personal Calling Assessment. Here are your results:</p>
            <div style="background: white; padding: 16px; border-radius: 14px; border: 1px solid #e5e5e5; margin-bottom: 16px;">
              <p style="margin: 4px 0; font-size: 14px;"><strong>Primary Gift:</strong> ${t(`giftRec.${sortedGifts[0][0]}`)}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Secondary Gift:</strong> ${t(`giftRec.${sortedGifts[1][0]}`)}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Recommended Ministry:</strong> ${t(`ministry.${sortedMinistry[0][0]}`)}</p>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">This assessment was submitted on ${submittedAt}.</p>
          </div>
        `;

        try {
          await sendGmailEmail(
            tokens,
            trainee.email.trim(),
            'Your LINC Spiritual Gifts Assessment Results',
            emailHtml.trim()
          );
        } catch (emailErr) {
          console.error('Email send failed:', emailErr);
        }
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError(t('assessment.failed'));
    } finally {
      setLoading(false);
    }
  };

  const r = submitted ? getResults() : null;

  if (submitted && r) {
    return (
      <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-[#8b1e1e] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="text-[clamp(1.22rem,4vw,1.55rem)] text-[#8b1e1e] mb-5">{t('assessment.assessmentResults')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] mb-[18px]">
            {[
              { label: t('assessment.primaryGift'), value: r.primaryGift },
              { label: t('assessment.secondaryGift'), value: r.secondaryGift },
              { label: t('assessment.recommendedMinistry'), value: r.recommendedMinistry }
            ].map((item, i) => (
              <div key={i} className="bg-[#f8eeee] border border-[rgba(139,30,30,0.12)] rounded-[18px] p-4">
                <span className="block text-[#666] font-bold mb-1 text-sm">{item.label}</span>
                <strong className="text-[#641414] text-[1.05rem]">{item.value}</strong>
              </div>
            ))}
          </div>
          <div className="bg-[#fffafa] border-l-4 border-[#8b1e1e] rounded-[14px] p-[14px_16px] font-bold italic mb-[18px]" style={{ [dir === 'rtl' ? 'borderRight' : 'borderLeft']: '4px solid #8b1e1e', [dir === 'rtl' ? 'borderLeft' : 'borderRight']: 'none' }}>
            {r.summary}
          </div>
          <h3 className="text-[1.05rem] text-[#641414] font-bold mb-[14px] mt-[26px]">{t('assessment.giftScores')}</h3>
          <div className="grid gap-[10px] mb-[18px]">
            {GIFT_SECTIONS.map(key => (
              <div key={key} className="flex justify-between items-center gap-[14px] bg-[#fafafa] border border-[#ddd] rounded-[14px] p-3">
                <span className="text-[#242424]">{t(`gift.${key}.title`)}</span>
                <strong className="text-[#641414] whitespace-nowrap">{r.giftTotals[key]} / 25</strong>
              </div>
            ))}
          </div>
          <h3 className="text-[1.05rem] text-[#641414] font-bold mb-[14px] mt-[26px]">{t('assessment.ministryScores')}</h3>
          <div className="grid gap-[10px] mb-[18px]">
            {MINISTRY_IDS.map(id => (
              <div key={id} className="flex justify-between items-center gap-[14px] bg-[#fafafa] border border-[#ddd] rounded-[14px] p-3">
                <span className="text-[#242424]">{t(`ministry.${id}`)}</span>
                <strong className="text-[#641414] whitespace-nowrap">{r.ministryTotals[id as keyof MinistryScores]} / 5</strong>
              </div>
            ))}
          </div>
        </motion.div>
        <button
          onClick={() => setSubmitted(false)}
          className="w-full min-h-[56px] mt-6 border-none bg-[#8b1e1e] text-white py-4 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.08rem]"
        >
          {t('assessment.takeAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] mx-auto px-[18px]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <PageTitle title={t('assessment.title')} subtitle={t('assessment.program')} icon={<ClipboardList size={22} />} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-[14px] font-bold">{error}</div>
        )}

        {/* Trainee Information */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">{t('assessment.traineeInfo')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRAINEE_IDS.map(f => (
              <div key={f} className="mb-[18px]">
                <label className="block font-bold mb-[7px] text-[#333]">
                  {t(`trainee.${f}`)} {!REQUIRED_TRAINEE.includes(f) && <span className="text-[#8b1e1e]">*</span>}
                </label>
                {['attendance', 'currentService'].includes(f) ? (
                  <textarea
                    required={REQUIRED_TRAINEE.includes(f)}
                    className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                    style={{ minHeight: '112px', resize: 'vertical' }}
                    value={trainee[f] || ''}
                    onChange={e => setTrainee(p => ({ ...p, [f]: e.target.value }))}
                  />
                ) : (
                  <input
                    required={REQUIRED_TRAINEE.includes(f)}
                    type={f === 'email' ? 'email' : f === 'age' ? 'number' : f === 'surveyDate' ? 'date' : 'text'}
                    className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                    value={trainee[f] || ''}
                    onChange={e => setTrainee(p => ({ ...p, [f]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Faith Journey */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">{t('assessment.part1')}</h2>
          <div className="space-y-[22px]">
            {FAITH_IDS.map(qId => (
              <div key={qId} className="mb-[18px]">
                <label className="block font-bold mb-[7px] text-[#333]">{t(`faith.${qId}`)}</label>
                <textarea
                  required
                  className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                  style={{ minHeight: '112px', resize: 'vertical' }}
                  value={faithAnswers[qId] || ''}
                  onChange={e => setFaithAnswers(p => ({ ...p, [qId]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Gifts Assessment */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">{t('assessment.part2')}</h2>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-3">{t('assessment.rateGuide')}</div>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-6">{t('assessment.scale')}</div>

          {GIFT_SECTIONS.map(sectionKey => (
            <div key={sectionKey} className="mt-[18px]">
              <h3 className="text-[#641414] mb-[14px] mt-[26px] text-[clamp(1.05rem,3.5vw,1.28rem)] font-bold">{t(`gift.${sectionKey}.title`)}</h3>
              {GIFT_QUESTIONS[sectionKey].map(qId => (
                <div key={qId} className="border border-[#ddd] p-4 rounded-[18px] mb-[14px] bg-[linear-gradient(180deg,#fff,#fffafa)]">
                  <p className="font-bold m-0 mb-[14px] text-[#333]">{qId}. {t(`gift.${qId}`)}</p>
                  <div className="grid grid-cols-5 gap-[10px]">
                    {[1, 2, 3, 4, 5].map(num => (
                      <label
                        key={num}
                        className={`relative grid place-items-center min-h-[48px] border rounded-[14px] cursor-pointer bg-[#fafafa] transition-[transform,border-color,background,box-shadow] duration-150 select-none hover:-translate-y-[1px] hover:border-[rgba(139,30,30,0.45)] hover:shadow-[0_4px_12px_rgba(139,30,30,0.12)] ${
                          giftScores[qId] === num ? 'bg-[#8b1e1e] border-[#8b1e1e] shadow-[0_8px_18px_rgba(139,30,30,0.22)]' : 'border-[#ddd]'
                        }`}
                      >
                        <input type="radio" name={qId} value={num} className="absolute opacity-0 pointer-events-none" checked={giftScores[qId] === num} onChange={() => setGiftScores(p => ({ ...p, [qId]: num }))} />
                        <span className={`grid place-items-center w-full h-full font-bold ${giftScores[qId] === num ? 'text-white' : 'text-[#444]'}`}>{num}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* Ministry Alignment */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">{t('assessment.part3')}</h2>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-3">{t('assessment.rateGuide')}</div>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-6">{t('assessment.scale')}</div>

          {MINISTRY_IDS.map(id => (
            <div key={id} className="border border-[#ddd] p-4 rounded-[18px] mb-[14px] bg-[linear-gradient(180deg,#fff,#fffafa)]">
              <p className="font-bold m-0 mb-[14px] text-[#333]">{id}. {t(`ministry.${id}`)}</p>
              <div className="grid grid-cols-5 gap-[10px]">
                {[1, 2, 3, 4, 5].map(num => (
                  <label
                    key={num}
                    className={`relative grid place-items-center min-h-[48px] border rounded-[14px] cursor-pointer bg-[#fafafa] transition-[transform,border-color,background,box-shadow] duration-150 select-none hover:-translate-y-[1px] hover:border-[rgba(139,30,30,0.45)] hover:shadow-[0_4px_12px_rgba(139,30,30,0.12)] ${
                      ministryScores[id] === num ? 'bg-[#8b1e1e] border-[#8b1e1e] shadow-[0_8px_18px_rgba(139,30,30,0.22)]' : 'border-[#ddd]'
                    }`}
                  >
                    <input type="radio" name={id} value={num} className="absolute opacity-0 pointer-events-none" checked={ministryScores[id] === num} onChange={() => setMinistryScores(p => ({ ...p, [id]: num }))} />
                    <span className={`grid place-items-center w-full h-full font-bold ${ministryScores[id] === num ? 'text-white' : 'text-[#444]'}`}>{num}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Vision Questions */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold border-b-2 border-[#f8eeee] pb-[10px]">{t('assessment.part4')}</h2>
          <div className="space-y-[22px]">
            {VISION_IDS.map(vId => (
              <div key={vId} className="mb-[18px]">
                <label className="block font-bold mb-[7px] text-[#333]">
                  {t(`vision.${vId}`)} {vId !== 'v6' && <span className="text-[#8b1e1e]">*</span>}
                </label>
                <textarea
                  required={vId !== 'v6'}
                  className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                  style={{ minHeight: '112px', resize: 'vertical' }}
                  value={visionAnswers[vId] || ''}
                  onChange={e => setVisionAnswers(p => ({ ...p, [vId]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </section>

        <button type="submit" disabled={loading} className="w-full min-h-[56px] mb-6 border-none bg-[#8b1e1e] text-white py-4 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.08rem] disabled:cursor-not-allowed disabled:opacity-72 disabled:translate-y-0">
          {loading ? t('assessment.submitting') : t('assessment.submit')}
        </button>

        <p className="text-[10px] text-[#999] uppercase tracking-widest text-center mt-4">{t('assessment.confidential')}</p>
      </form>
    </div>
  );
}
