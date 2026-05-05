import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ClipboardList, LogIn, ArrowRight, Heart, BookOpen, Users, Star } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    document.title = 'LINC Spiritual Gifts Assessment';
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#f5f4f0]">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle at 50% 0%, #8b1e1e, transparent 60%)',
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        />
        <div className="relative text-center px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-[60px] h-[60px] grid place-items-center mx-auto mb-6 rounded-full bg-[#8b1e1e] text-white text-2xl shadow-[0_8px_28px_rgba(139,30,30,0.25)]">
              ✦
            </div>
            <h1 className="text-[clamp(2.2rem,6vw,3.8rem)] font-bold text-[#8b1e1e] leading-[1.15] tracking-[-0.02em] mb-6">
              LINC Spiritual Gifts
              <br />
              <span className="text-[#641414]">& Personal Calling Assessment</span>
            </h1>
            <p className="text-[#666] text-[clamp(1rem,2.5vw,1.2rem)] max-w-2xl mx-auto mb-10 leading-relaxed">
              Discover your unique spiritual gifts, explore your calling, and align with the ministry where God has placed your heart.
            </p>
            <p className="text-[#999] uppercase tracking-[0.25em] text-xs font-bold mb-12">
              Leadership Development Program | 2026–2028
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/assessment')}
                className="inline-flex items-center gap-3 min-h-[56px] px-10 bg-[#8b1e1e] text-white rounded-full font-bold text-lg shadow-[0_8px_28px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[2px] hover:shadow-[0_12px_32px_rgba(139,30,30,0.3)]"
              >
                Begin Assessment
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-3 min-h-[56px] px-10 bg-white text-[#8b1e1e] border-2 border-[#8b1e1e] rounded-full font-bold text-lg transition-transform hover:-translate-y-[2px] hover:bg-[#f8eeee]"
              >
                <LogIn size={18} />
                Pastor Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-[clamp(1.6rem,4vw,2.4rem)] font-bold text-[#8b1e1e] mb-16"
          >
            How It Works
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <ClipboardList size={32} />,
                title: 'Take the Assessment',
                desc: 'Answer thoughtful questions about your faith journey, spiritual gifts, and ministry passions.',
                delay: 0.1,
              },
              {
                icon: <Star size={32} />,
                title: 'Discover Your Gifts',
                desc: 'Receive a personalized report highlighting your primary and secondary spiritual gifts.',
                delay: 0.2,
              },
              {
                icon: <Heart size={32} />,
                title: 'Find Your Calling',
                desc: 'Get matched with the ministry area that aligns with your unique gifts and passions.',
                delay: 0.3,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: item.delay, duration: 0.5 }}
                className="text-center p-8 rounded-[22px] bg-[#f5f4f0] border border-[rgba(139,30,30,0.08)]"
              >
                <div className="w-16 h-16 grid place-items-center mx-auto mb-6 rounded-2xl bg-[#f8eeee] text-[#8b1e1e]">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-[#641414] mb-3">{item.title}</h3>
                <p className="text-[#666] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-20 px-6 bg-[#f5f4f0]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="w-12 h-12 grid place-items-center mx-auto mb-6 rounded-full bg-[#8b1e1e] text-white text-lg shadow-lg">
              <BookOpen size={20} />
            </div>
            <h2 className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold text-[#8b1e1e] mb-6">
              About the Program
            </h2>
            <p className="text-[#666] text-lg leading-relaxed max-w-3xl mx-auto mb-6">
              The LINC Spiritual Gifts Assessment is designed to help you identify your God-given strengths and discover where you can serve most effectively. Through thoughtful questions covering five gift areas and ten ministry domains, you'll gain clarity on your spiritual calling.
            </p>
            <div className="flex flex-wrap justify-center gap-6 mt-10">
              {['Apostolic', 'Prophetic', 'Evangelistic', 'Pastoral', 'Teaching'].map(gift => (
                <span key={gift} className="px-5 py-2 bg-white rounded-full text-sm font-bold text-[#8b1e1e] border border-[rgba(139,30,30,0.12)] shadow-sm">
                  {gift}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#8b1e1e] text-white text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <div className="w-16 h-16 grid place-items-center mx-auto mb-6 rounded-full bg-white/10 text-2xl border border-white/20">
            <Users size={28} />
          </div>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold mb-6">
            Ready to Discover Your Calling?
          </h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-10">
            Join the Leadership Development Program and take the first step toward fulfilling your God-given purpose.
          </p>
          <button
            onClick={() => navigate('/assessment')}
            className="inline-flex items-center gap-3 min-h-[56px] px-12 bg-white text-[#8b1e1e] rounded-full font-bold text-lg shadow-lg transition-transform hover:-translate-y-[2px]"
          >
            Start Your Assessment
            <ArrowRight size={20} />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-[#1a1a1a] text-white/60 text-center">
        <p className="text-sm italic">LINC Spiritual Gifts & Personal Calling Assessment</p>
        <p className="text-xs mt-2 text-white/30">Leadership Development Program | 2026–2028</p>
      </footer>
    </div>
  );
}
