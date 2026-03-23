import React from 'react';
import { motion } from 'motion/react';
import { Activity, ArrowRight, Shield, Zap, Clipboard, FileText } from 'lucide-react';

interface LandingPageProps {
  onLaunch: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
  return (
    <div className="min-h-screen bg-[#A3E635] font-sans text-[#1E1B4B] overflow-x-hidden">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#1E1B4B] rounded-xl shadow-lg">
            <Activity className="w-6 h-6 text-[#A3E635]" />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase">CliniScript</span>
        </div>
        <div className="hidden md:flex items-center space-x-8 text-sm font-bold uppercase tracking-widest">
          <a href="#" className="hover:opacity-60 transition-opacity">Solutions</a>
          <a href="#" className="hover:opacity-60 transition-opacity">Compliance</a>
          <a href="#" className="hover:opacity-60 transition-opacity">Security</a>
          <button 
            onClick={onLaunch}
            className="px-6 py-3 bg-[#1E1B4B] text-[#A3E635] rounded-full hover:scale-105 transition-transform active:scale-95 shadow-xl"
          >
            Launch Tool
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-12 pb-24 relative overflow-hidden">
        {/* Background Text */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 select-none pointer-events-none opacity-10">
          <h2 className="text-[40vw] font-display uppercase leading-none">HEALTHCARE</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-[12vw] lg:text-[8vw] font-display leading-[0.85] tracking-tighter uppercase mb-8">
                Healthcare<br />
                <span className="text-white">& Pharmacy</span><br />
                Intelligence
              </h1>
              <p className="text-xl lg:text-2xl font-medium max-w-lg mb-12 leading-tight">
                Transform handwritten clinical notes and pharmacy prescriptions into structured, compliant medical data with AI-powered precision.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={onLaunch}
                  className="group flex items-center justify-center space-x-4 px-10 py-6 bg-[#1E1B4B] text-[#A3E635] rounded-3xl text-xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-2xl hover:translate-y-[-4px] active:translate-y-0"
                >
                  <span>Launch Tool</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </button>
                <div className="flex items-center space-x-4 px-8 py-6 bg-white/30 backdrop-blur-md rounded-3xl border border-white/20">
                  <Shield className="w-6 h-6" />
                  <span className="font-bold uppercase tracking-widest text-sm">HIPAA Compliant</span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="relative lg:h-[600px] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10 w-full max-w-md"
            >
              <div className="bg-[#1E1B4B] rounded-[3rem] p-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500 relative">
                {/* Badge */}
                <div className="absolute -top-6 -right-6 bg-white text-[#1E1B4B] px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-xl z-20 transform -rotate-12">
                  New v2.0
                </div>
                
                <img 
                  src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=800" 
                  alt="Medical Professional" 
                  className="w-full h-80 object-cover rounded-[2rem] mb-8 grayscale hover:grayscale-0 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 text-[#A3E635]">
                    <Zap className="w-6 h-6 fill-current" />
                    <span className="font-black uppercase tracking-widest">Real-time Analysis</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#A3E635]"
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-white rounded-full mix-blend-overlay blur-2xl animate-pulse" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#1E1B4B] rounded-full mix-blend-overlay blur-3xl opacity-20" />
            </motion.div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-24">
          <FeatureCard 
            icon={<Clipboard className="w-8 h-8" />}
            title="OCR Extraction"
            description="Digitize handwritten prescriptions and notes with 99% accuracy."
          />
          <FeatureCard 
            icon={<Shield className="w-8 h-8" />}
            title="MRD Compliance"
            description="Automated auditing for Medical Record Department standards."
          />
          <FeatureCard 
            icon={<FileText className="w-8 h-8" />}
            title="Structured Data"
            description="Export to HL7/FHIR compatible formats for seamless EMR integration."
          />
          <FeatureCard 
            icon={<Zap className="w-8 h-8" />}
            title="Pharmacy Sync"
            description="Real-time medication inventory and prescription fulfillment."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1E1B4B] text-white py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-[#A3E635]" />
            <span className="text-xl font-black tracking-tighter uppercase">CliniScript</span>
          </div>
          <p className="text-sm opacity-60 font-medium">© 2026 CliniScript AI. All rights reserved.</p>
          <div className="flex space-x-6 text-xs font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-[#A3E635] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#A3E635] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#A3E635] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-black/5"
  >
    <div className="w-16 h-16 bg-[#A3E635] rounded-2xl flex items-center justify-center mb-6 shadow-inner">
      {icon}
    </div>
    <h3 className="text-2xl font-black uppercase tracking-tight mb-3">{title}</h3>
    <p className="text-slate-600 font-medium leading-snug">{description}</p>
  </motion.div>
);
