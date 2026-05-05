import { useEffect } from 'react';
import { Gavel, ScrollText, CheckCircle, AlertCircle } from 'lucide-react';

export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service | LINC';
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 md:p-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
            <Gavel className="text-[#8B1E1E]" />
          </div>
          <h1 className="text-4xl font-serif text-[#1C1917]">Terms of Service</h1>
        </div>

        <div className="space-y-8 text-stone-600 leading-relaxed">
          <section>
            <h2 className="text-2xl font-serif text-stone-900 mb-4 flex items-center gap-2">
              <ScrollText size={20} className="text-[#8B1E1E]" />
              Acceptance of Terms
            </h2>
            <p>
              By accessing the LINC Portal, you agree to be bound by these Terms of Service. This platform is designed for spiritual assessment and ministry coordination. Users are expected to provide truthful information and use the tools provided with integrity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-stone-900 mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-[#8B1E1E]" />
              User Responsibilities
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. Use of the Google integration features must comply with Google's own acceptable use policies. You agree not to use this portal for any unlawful or unauthorized purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-stone-900 mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-[#8B1E1E]" />
              Ministry Scope
            </h2>
            <p>
              The LINC Portal is a tool for spiritual guidance. The assessments and feedback provided are within a ministry context and do not constitute professional psychological or medical advice.
            </p>
          </section>

          <section className="pt-8 border-t border-stone-100">
            <p className="text-sm italic">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
