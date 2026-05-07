import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Lock, User, Thermometer, Droplets, Wind, Sun } from 'lucide-react';

export default function GreenRoofSurveyPage() {
  useEffect(() => {
    // Update page title
    document.title = 'Green Roof & Terrace Garden Survey | Urban Climate Adaptation India 2026';
  }, []);

  const benefits = [
    {
      icon: <Thermometer className="h-6 w-6 text-white" />,
      emoji: '🌡️',
      title: 'Beat the Heat',
      description: 'Green roofs naturally cool your building, reducing AC costs and the urban heat island effect.'
    },
    {
      icon: <Droplets className="h-6 w-6 text-white" />,
      emoji: '💧',
      title: 'Manage Rainwater',
      description: 'Terrace gardens absorb and slow down runoff, reducing flooding and waterlogging in your colony.'
    },
    {
      icon: <Wind className="h-6 w-6 text-white" />,
      emoji: '🌬️',
      title: 'Cleaner Air',
      description: 'Plants filter pollutants and dust, creating noticeably fresher air in your neighbourhood.'
    },
    {
      icon: <Sun className="h-6 w-6 text-white" />,
      emoji: '☀️',
      title: 'Solar + Greenery',
      description: 'Combine solar panels with green roofs to generate clean electricity and grow food simultaneously.'
    }
  ];

  const surveyUses = [
    'What stops residents from creating green roofs and terrace gardens',
    'Real challenges faced by building owners in Indian cities',
    'What support or incentives would motivate you to act'
  ];

  const responseHelps = [
    'Design practical solutions for Indian homes',
    'Push for better government policies and incentives',
    'Build a community of urban greening advocates'
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Hero Section */}
      <section 
        className="relative py-20 px-6 text-center overflow-hidden"
        style={{ background: '#1a3d2b' }}
      >
        {/* Background gradient overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 20% 80%, rgba(58,125,68,0.4) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(124,184,127,0.3) 0%, transparent 50%)'
          }}
        />
        
        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block mb-6 px-4 py-2 rounded-full text-xs font-medium tracking-wider uppercase"
            style={{ 
              color: '#e8a020', 
              border: '1px solid rgba(232,160,32,0.4)',
              background: 'rgba(232,160,32,0.1)'
            }}
          >
            Urban Climate Adaptation · Pilot Study 2026
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: '#fff' }}
          >
            Your roof could cool{' '}
            <span style={{ color: '#7cb87f' }}>your home</span> and{' '}
            <span style={{ color: '#7cb87f' }}>your city</span>.
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10"
            style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 300 }}
          >
            Indian cities are heating up. Green roofs and terrace gardens offer a simple, 
            powerful solution — right above your head.
          </motion.p>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}
            >
              <Clock className="h-4 w-4" />
              <span>10–12 minutes</span>
            </div>
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}
            >
              <Lock className="h-4 w-4" />
              <span>Anonymous & confidential</span>
            </div>
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}
            >
              <User className="h-4 w-4" />
              <span>Research only</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impact Strip - Why It Matters */}
      <section className="py-16 px-6" style={{ background: '#f7f3ec' }}>
        <div className="max-w-5xl mx-auto">
          {/* Section Label */}
          <div 
            className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-medium tracking-wider uppercase"
            style={{ color: '#3a7d44', border: '1px solid rgba(58,125,68,0.3)', background: 'rgba(58,125,68,0.08)' }}
          >
            Why it matters
          </div>

          <h2 
            className="text-3xl md:text-4xl font-bold mb-12"
            style={{ fontFamily: "'Playfair Display', serif", color: '#1a3d2b' }}
          >
            Green roofs tackle urban problems that every city dweller feels
          </h2>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-4"
                  style={{ background: 'linear-gradient(135deg, #3a7d44 0%, #7cb87f 100%)' }}
                >
                  {benefit.emoji}
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#1a3d2b' }}>
                  {benefit.title}
                </h3>
                <p className="text-sm" style={{ color: '#5a5a5a' }}>
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Survey Section */}
      <section className="py-16 px-6" style={{ background: '#fdfaf5' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-10">
            {/* Left Column - Survey Meta */}
            <div className="lg:col-span-2">
              {/* Section Label */}
              <div 
                className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-medium tracking-wider uppercase"
                style={{ color: '#3a7d44', border: '1px solid rgba(58,125,68,0.3)', background: 'rgba(58,125,68,0.08)' }}
              >
                About this survey
              </div>

              <h2 
                className="text-2xl md:text-3xl font-bold mb-6"
                style={{ fontFamily: "'Playfair Display', serif", color: '#1a3d2b' }}
              >
                Help us understand what holds India back
              </h2>

              <p className="mb-6" style={{ color: '#5a5a5a', lineHeight: 1.7 }}>
                Despite the clear benefits, very few Indian homeowners have adopted green roofs yet. 
                This survey explores the real barriers and what kind of support would make a difference.
              </p>

              <p className="font-medium mb-3" style={{ color: '#1a3d2b' }}>
                We want to learn:
              </p>
              <ul className="space-y-3 mb-8">
                {surveyUses.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span 
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                      style={{ background: '#3a7d44' }}
                    >
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span style={{ color: '#5a5a5a' }}>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="font-medium mb-3" style={{ color: '#1a3d2b' }}>
                Your responses will help us:
              </p>
              <ul className="space-y-3 mb-8">
                {responseHelps.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span 
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                      style={{ background: '#3a7d44' }}
                    >
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span style={{ color: '#5a5a5a' }}>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Privacy Note */}
              <div 
                className="p-4 rounded-lg border-l-4"
                style={{ 
                  background: 'rgba(58,125,68,0.06)', 
                  borderColor: '#3a7d44' 
                }}
              >
                <p className="text-sm" style={{ color: '#3a7d44' }}>
                  <Lock className="inline h-4 w-4 mr-2" />
                  <strong>Privacy:</strong> Your responses are fully anonymous and used only for academic research. 
                  All information is kept confidential.
                </p>
              </div>
            </div>

            {/* Right Column - Survey Iframe */}
            <div className="lg:col-span-3">
              <div 
                className="bg-white rounded-xl shadow-lg overflow-hidden"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <iframe
                  src="https://survey.zohopublic.in/zs/4OEhai"
                  width="100%"
                  height="700"
                  style={{ border: 'none', display: 'block' }}
                  title="Green Roof Survey"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 text-center" style={{ background: '#1a3d2b' }}>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Conducted by <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Shivani Thakur</strong>, PhD Scholar
        </p>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Part of the Urban Climate Adaptation Pilot Study · India, 2026
        </p>
      </footer>
    </div>
  );
}
