import { useEffect } from 'react';
import { motion } from 'motion/react';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function PageTitle({ title, subtitle, icon }: PageTitleProps) {
  useEffect(() => {
    document.title = `${title} | LINC Pastor Dashboard`;
  }, [title]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[rgba(255,255,255,0.92)] border border-[rgba(139,30,30,0.12)] rounded-[22px] p-[clamp(26px,5vw,46px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)] mb-8"
    >
      <div className="text-center">
        {icon && (
          <div className="w-[46px] h-[46px] grid place-items-center mx-auto mb-[10px] rounded-full text-white bg-[#8b1e1e] shadow-[0_8px_18px_rgba(139,30,30,0.25)] text-[1.4rem]">
            {icon}
          </div>
        )}
        <h1 className="relative m-0 mb-[10px] text-[#8b1e1e] text-[clamp(1.55rem,5vw,2.45rem)] font-bold leading-[1.2] tracking-[-0.02em]">
          {title}
        </h1>
        {subtitle && (
          <p className="relative m-0 text-[#666] font-bold text-[clamp(0.95rem,2.6vw,1.08rem)]">
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}
