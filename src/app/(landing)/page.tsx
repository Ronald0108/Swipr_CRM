'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import {
  Check,
  ChevronDown,
  Keyboard,
  Zap,
  Layers,
  Activity,
  X,
  Mail,
  Linkedin,
} from 'lucide-react';
import Link from 'next/link';

// ── Hardcoded demo video ─────────────────────────────────────────────────
const YOUTUBE_VIDEO_ID = 'Yp5x-k25RvE';
const SCHEDULE_URL = process.env.NEXT_PUBLIC_SCHEDULE_URL || 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0-ZaHYO1gMxbNE0EFZ_4yxqFxDisi8n0vIWLwqQO03WAuOaBSaZnR8f1EcOFbygIjQ14iIwNrL';
const ENABLE_SUBSCRIPTIONS = process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS === 'true';

// ── Animation helpers ────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: 'easeOut' as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

// ── FAQ Data ─────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'What is SwiprCRM?',
    a: 'SwiprCRM is a keyboard-centric lead management tool that lets your sales team qualify, sort, and act on leads at blazing speed. Think Tinder for your pipeline — swipe right on hot leads, left on cold ones, all without touching your mouse.',
  },
  {
    q: 'What inspired the creation of SwiprCRM?',
    a: 'During my time as an SDR, I found myself constantly feeling burned out by navigating and managing CRMs during prospecting. I built SwiprCRM to remove the friction, clutter, and endless clicking found in traditional CRMs.',
  },
  {
    q: 'How is this different from traditional CRMs?',
    a: 'SwiprCRM focuses on speed and flow, not heavy admin work. With a swipe-to-sort workflow, one-keypress actions, minimal UI, and fast lead-to-lead navigation, it is designed for outbound reps who need speed over complexity.',
  },
  {
    q: 'Can my leads be imported or exported into SwiprCRM?',
    a: 'Yes! SwiprCRM supports lead import via CSV and integrates with existing CRM tools like HubSpot so you can easily sync your pipeline.',
  },
  {
    q: 'Who are the intended users for SwiprCRM?',
    a: 'SwiprCRM is built for SDRs, outbound sales teams, and founders doing their own prospecting who want velocity without manager-centric clutter.',
  },
  {
    q: "What if I don't like the design?",
    a: 'We emphasize a clean, minimal, and modern UI. If you have feedback or need specific customizations, you can reach out directly to the founder or join our community Discord to share your ideas.',
  },
  {
    q: 'What is the community Discord for?',
    a: 'The community Discord is open to all users to give feedback, troubleshoot, and discuss all things SwiprCRM. You will get access to it once you join!',
  },
];

// ── Problems & Solutions ─────────────────────────────────────────────────
const PROBLEMS = [
  'Spreadsheets slow your team down',
  'Reps waste hours on unqualified leads',
  'Context-switching kills productivity',
  'No visibility into rep activity',
  'Manual data entry causes CRM fatigue',
];

const SOLUTIONS = [
  'Sortable, swipeable lead interface',
  'Act on any lead in a single keypress',
  'In-app email drafts and phone dialer',
  'Real-time activity dashboard',
  'CSV and HubSpot sync built-in',
];

// ── Component: FAQ Accordion Item ────────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#e7e7e7] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center justify-between px-1 py-6 text-left"
        aria-expanded={open}
      >
        <span className="pr-8 text-[15px] font-medium text-[#1d1d1f] transition-colors group-hover:text-[#5147e6]">
          {question}
        </span>
        <ChevronDown
          className="faq-chevron h-5 w-5 flex-shrink-0 text-[#9a9a9f]"
          data-open={String(open)}
        />
      </button>
      <div className="faq-content" data-open={String(open)}>
        <p className="px-1 pb-6 text-sm leading-relaxed text-[#5f5f66]">
          {answer}
        </p>
      </div>
    </div>
  );
}

// ── Component: Section reveal wrapper ────────────────────────────────────
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      custom={delay}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Main Landing Page ────────────────────────────────────────────────────
export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const videoRef = useRef<HTMLIFrameElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Nav scroll effect
  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for YouTube autoplay on scroll
  useEffect(() => {
    if (!YOUTUBE_VIDEO_ID || !videoContainerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !videoPlaying) {
          setVideoPlaying(true);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(videoContainerRef.current);
    return () => observer.disconnect();
  }, [videoPlaying]);

  const videoSrc = videoPlaying && YOUTUBE_VIDEO_ID
    ? `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&vq=hd1080`
    : undefined;

  const handleWaitlistSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = encodeURIComponent('SwiprCRM waitlist request');
    const body = encodeURIComponent(`Please add me to the SwiprCRM waitlist.\n\nEmail: ${waitlistEmail}`);
    window.location.href = `mailto:ronaldchiong2005@gmail.com?subject=${subject}&body=${body}`;
  }, [waitlistEmail]);

  return (
    <div className="landing-framer-page min-h-screen bg-[#f5f5f5] text-[#1d1d1f] selection:bg-[#a97eff]/30 transition-colors duration-300">
      {/* ═══════════ NAVIGATION ═══════════ */}
      <nav
        className={`landing-nav landing-framer-nav fixed top-0 w-full z-50 ${
          navScrolled ? 'scrolled' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-[86px] max-w-[1200px] items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl">
              <img
                src="/images/logo_transparent.png"
                alt="SwiprCRM"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-normal text-base tracking-[-0.01em] text-white">
              SwiprCRM
            </span>
          </div>

          <div className="hidden items-center gap-7 text-sm font-normal text-white md:flex">
            <a href="#features" className="opacity-90 transition-opacity hover:opacity-100">Features</a>
            <a href="#approach" className="opacity-90 transition-opacity hover:opacity-100">Approach</a>
            <a href="#pricing" className="opacity-90 transition-opacity hover:opacity-100">Pricing</a>
            <a href="#faq" className="opacity-90 transition-opacity hover:opacity-100">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="landing-login-button hidden items-center gap-4 rounded-lg px-5 py-3 text-sm font-normal text-white sm:flex"
            >
              Login
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">→</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="landing-hero-gradient px-6 pb-24 pt-[150px]">
        <div className="mx-auto max-w-[1160px] text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div
              variants={fadeUp}
              custom={0}
              className="mb-5 text-xs font-normal uppercase tracking-[0.38em] text-white"
            >
              SWIPRCRM
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={0.1}
              className="mx-auto mb-6 max-w-[1160px] text-[44px] font-normal leading-[0.98] tracking-[-0.06em] text-white sm:text-[64px] md:text-[88px]"
            >
              High-velocity lead sorting tool for your sales team
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={0.2}
              className="mx-auto mb-10 max-w-2xl text-[18px] leading-relaxed text-white/70"
            >
              A keyboard-centric interface for sorting your leads
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={0.3}
              className="mb-14 flex flex-col items-center justify-center gap-4"
            >
              <a
                href={SCHEDULE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-[46px] items-center justify-center rounded-lg bg-white px-8 text-sm font-normal text-[#1d1d1f] transition-transform hover:-translate-y-0.5"
              >
                Book a strategy call
              </a>
              <form onSubmit={handleWaitlistSubmit} className="landing-waitlist-form">
                <input
                  value={waitlistEmail}
                  onChange={(event) => setWaitlistEmail(event.target.value)}
                  type="email"
                  placeholder="Your Email Address"
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/62"
                  required
                />
                <button type="submit" className="rounded-md bg-white px-5 py-3 text-sm font-normal text-[#1d1d1f]">
                  Join Waitlist
                </button>
              </form>
            </motion.div>
          </motion.div>
        </div>

        {/* ═══════════ VIDEO DEMO ═══════════ */}
        <div className="landing-cloud-bg mx-auto max-w-[1040px] pb-4 pt-8">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            className="relative z-10 mx-auto"
          >
            <div
              ref={videoContainerRef}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50"
            >
              {/* Browser chrome mockup */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/90 border-b border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 mx-3">
                  <div className="h-6 rounded-md bg-gray-700/60 flex items-center px-3">
                    <span className="text-[11px] text-gray-400 truncate">
                    https://www.youtube.com/Swipr_CRM/demo_video
                    </span>
                  </div>
                </div>
              </div>

              {/* Video area */}
              <div className="aspect-video bg-gray-900 relative">
                {YOUTUBE_VIDEO_ID ? (
                  <>
                    {videoSrc ? (
                      <iframe
                        ref={videoRef}
                        className="w-full h-full"
                        src={videoSrc}
                        title="SwiprCRM Demo"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      /* Thumbnail placeholder before autoplay triggers */
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                          <p className="text-white/60 text-sm">Scroll to play demo</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* No video configured */
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/40 to-gray-900">
                    <div className="text-center px-8">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Keyboard className="w-8 h-8 text-violet-300" />
                      </div>
                      <p className="text-white/80 font-semibold text-lg mb-1">SwiprCRM Demo</p>
                      <p className="text-white/40 text-sm">
                        Set NEXT_PUBLIC_YOUTUBE_VIDEO_ID to display your demo video
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="bg-[#f5f5f5] px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1d1d1f]">
                Features
              </p>
            </div>
          </Reveal>

          <div className="space-y-3">
            {[
              {
                icon: <Zap className="h-7 w-7 text-white" />,
                title: 'Timesaver',
                desc: 'Qualify leads, send follow-ups, update CRMs, and move deals forward in seconds',
              },
              {
                icon: <Keyboard className="h-7 w-7 text-white" />,
                title: 'Keyboard-Centric',
                desc: 'Every action can be initiated from a single keypress',
              },
              {
                icon: <Layers className="h-7 w-7 text-white" />,
                title: 'Unlimited Swipes',
                desc: 'No limits to how many leads you can process',
              },
              {
                icon: <Activity className="h-7 w-7 text-white" />,
                title: 'Flow State',
                desc: 'A swipe-based experience that engages, reduces decision fatigue, and turns lead management into a high-velocity workflow',
              },
            ].map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.08}>
                <div className="landing-feature-row">
                  <div
                    className="flex h-[60px] w-[60px] items-center justify-center rounded-lg bg-gradient-to-b from-[#111111] via-[#5147e6] to-[#a97eff] shadow-lg shadow-[#5147e6]/20"
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-medium tracking-[-0.04em] text-[#1d1d1f]">
                    {feature.title}
                  </h3>
                  <p className="max-w-[520px] text-left text-base leading-relaxed text-[#4d4d52]">
                    {feature.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ ABOUT US ═══════════ */}
      <section id="approach" className="bg-[#f5f5f5] px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="mb-14">
              <h2 className="text-4xl font-normal tracking-[-0.06em] text-[#1d1d1f] sm:text-[52px]">
                The Reality of Lead Management
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Problems */}
            <Reveal delay={0.1}>
              <div className="rounded-2xl bg-white p-8">
                <h3 className="mb-6 text-2xl font-medium tracking-[-0.04em] text-[#1d1d1f]">
                  The Problems
                </h3>
                <ul className="space-y-4">
                  {PROBLEMS.map((problem) => (
                    <li
                      key={problem}
                      className="flex items-start gap-3 text-base text-[#4d4d52]"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <X className="w-3 h-3 text-red-400" />
                      </div>
                      {problem}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Solutions */}
            <Reveal delay={0.2}>
              <div className="rounded-2xl bg-[#1d1d1f] p-8 text-white">
                <h3 className="text-2xl font-medium tracking-[-0.04em] mb-6">The Solution</h3>
                <ul className="space-y-4">
                  {SOLUTIONS.map((solution) => (
                    <li
                      key={solution}
                      className="flex items-start gap-3 text-base text-white/70"
                    >
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[#a97eff]" />
                      </div>
                      {solution}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="bg-[#f5f5f5] px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#1d1d1f]">
                Pricing
              </p>
              <h2 className="text-4xl font-normal tracking-[-0.06em] text-[#1d1d1f] sm:text-[52px]">
                Pricing
              </h2>
              <p className="mt-3 text-[#5f5f66]">
                Simple, transparent pricing for teams of all sizes.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 items-start max-w-5xl mx-auto">
            {/* Individuals */}
            <Reveal delay={0.05}>
              <div className="pricing-card flex min-h-[520px] flex-col rounded-2xl bg-white p-7">
                <div className="mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9a9a9f]">
                    AFFORDABLE FOR EARLY STAGE
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-[#1d1d1f]">
                  Individuals
                </h3>
                <div className="mt-4 mb-6">
                  <span className="text-5xl font-semibold tracking-[-0.06em] text-[#1d1d1f]">
                    $15
                  </span>
                  <span className="text-sm font-medium text-[#77777d]">
                    /month
                  </span>
                </div>
                {ENABLE_SUBSCRIPTIONS ? (
                  <Link
                    href="/dashboard"
                    className="mb-6 w-full rounded-lg bg-[#1d1d1f] py-3 text-center text-sm font-medium text-white transition-colors hover:bg-[#313136]"
                  >
                    Get started
                  </Link>
                ) : (
                  <button
                    disabled
                    className="mb-6 w-full cursor-not-allowed rounded-lg bg-[#f1f1f1] py-3 text-center text-sm font-medium text-[#9a9a9f]"
                  >
                    Coming soon
                  </button>
                )}
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9a9a9f]">
                  THIS INCLUDES:
                </p>
                <ul className="space-y-3 flex-1">
                  {[
                    'Unlimited Swipes',
                    'Live Activity Dashboard',
                    'Integration with existing tools',
                    'Access to Community Slack',
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-sm text-[#4d4d52]"
                    >
                      <Check className="w-4 h-4 text-[#5147e6] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Teams — highlighted */}
            <Reveal delay={0.1}>
              <div className="pricing-card relative flex min-h-[520px] flex-col rounded-2xl bg-[#1d1d1f] p-7 text-white">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#1d1d1f]">
                    Featured
                  </span>
                </div>
                <div className="mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#a97eff]">
                    PRIORITY ACCESS
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mt-2">Teams</h3>
                <div className="mt-4 mb-6">
                  <span className="text-5xl font-semibold tracking-[-0.06em] text-white">
                    $12
                  </span>
                  <span className="text-sm font-medium text-white/55">
                    /month /seat
                  </span>
                </div>
                {ENABLE_SUBSCRIPTIONS ? (
                  <Link
                    href="/dashboard"
                    className="mb-6 w-full rounded-lg bg-white py-3 text-center text-sm font-medium text-[#1d1d1f] transition-colors hover:bg-white/90"
                  >
                    Get in touch
                  </Link>
                ) : (
                  <button
                    disabled
                    className="mb-6 w-full cursor-not-allowed rounded-lg bg-white/10 py-3 text-center text-sm font-medium text-white/45"
                  >
                    Coming soon
                  </button>
                )}
                <p className="text-xs font-semibold uppercase tracking-wider text-white/45 mb-3">
                  WHAT&apos;S INCLUDED:
                </p>
                <ul className="space-y-3 flex-1">
                  {[
                    'Everything in Individual',
                    'Admin Monitoring',
                    'Feature Request Priority',
                    'Personal Support',
                    'Priority Feature Access',
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-sm text-white/68"
                    >
                      <Check className="w-4 h-4 text-[#a97eff] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Enterprise */}
            <Reveal delay={0.15}>
              <div className="pricing-card flex min-h-[520px] flex-col rounded-2xl bg-white p-7">
                <div className="mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9a9a9f]">
                    FULL CUSTOMIZATION
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] mt-2">
                  Enterprise
                </h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-semibold tracking-[-0.05em] text-[#1d1d1f]">
                    Custom Pricing
                  </span>
                </div>
                <a
                  href={SCHEDULE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-6 w-full rounded-lg border border-[#dedede] bg-white py-3 text-center text-sm font-medium text-[#1d1d1f] transition-colors hover:bg-[#f7f7f7]"
                >
                  Contact Founder
                </a>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9a9a9f]">
                  INCLUDES:
                </p>
                <ul className="space-y-3 flex-1">
                  {['Custom Solutions', 'Dedicated Support', 'SLA Agreement'].map(
                    (item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2.5 text-sm text-[#4d4d52]"
                      >
                        <Check className="w-4 h-4 text-[#5147e6] flex-shrink-0" />
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" className="bg-[#f5f5f5] px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="mb-12">
              <h2 className="text-4xl font-normal tracking-[-0.06em] text-[#1d1d1f] sm:text-[52px]">
                Frequently
                <br />
                Asked Questions
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl bg-white px-7">
              {FAQ_ITEMS.map((item) => (
                <FAQItem
                  key={item.q}
                  question={item.q}
                  answer={item.a}
                />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-[#e7e7e7] bg-[#f5f5f5] px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg overflow-hidden">
                  <img
                    src="/images/logo_transparent.png"
                    alt="SwiprCRM"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-medium text-[15px] tracking-tight text-[#1d1d1f]">
                  SwiprCRM
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[#77777d]">
                High-velocity outbound CRM for modern sales teams.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9a9f] mb-4">
                Product
              </p>
              <ul className="space-y-2.5 text-sm text-[#77777d]">
                <li>
                  <a href="#features" className="transition-colors hover:text-[#1d1d1f]">Features</a>
                </li>
                <li>
                  <a href="#pricing" className="transition-colors hover:text-[#1d1d1f]">Pricing</a>
                </li>
                <li>
                  <Link href="/dashboard" className="transition-colors hover:text-[#1d1d1f]">Dashboard</Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9a9f] mb-4">
                Company
              </p>
              <ul className="space-y-2.5 text-sm text-[#77777d]">
                <li>
                  <a href="#approach" className="transition-colors hover:text-[#1d1d1f]">Approach</a>
                </li>
                <li>
                  <a href="#faq" className="transition-colors hover:text-[#1d1d1f]">FAQ</a>
                </li>
                <li>
                  <a href="https://discord.gg/V2Z3CanYz" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#1d1d1f]">Community Discord</a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9a9a9f] mb-4">
                Contact
              </p>
              <ul className="space-y-2.5 text-sm text-[#77777d]">
                <li>
                  <a
                    href="mailto:swiprcrm@gmail.com"
                    className="transition-colors hover:text-[#1d1d1f]"
                  >
                    Email Us
                  </a>
                </li>
                <li>
                  <a
                    href={SCHEDULE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-[#1d1d1f]"
                  >
                    Book a Call
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[#e7e7e7]">
            <p className="text-xs text-[#9a9a9f]">
              © {new Date().getFullYear()} SwiprCRM. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="mailto:swiprcrm@gmail.com"
                className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#9a9a9f] hover:text-[#1d1d1f] transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/swiprcrm/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#9a9a9f] hover:text-[#1d1d1f] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
