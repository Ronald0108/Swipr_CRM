'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import {
  ArrowRight,
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
import { ThemeToggle } from '@/app/components/ThemeToggle';

// ── YouTube Video ID from environment variable ───────────────────────────
const YOUTUBE_VIDEO_ID = process.env.NEXT_PUBLIC_YOUTUBE_VIDEO_ID || '';
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
    <div className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 px-1 text-left group"
        aria-expanded={open}
      >
        <span className="text-[15px] font-medium text-gray-900 dark:text-gray-100 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors pr-8">
          {question}
        </span>
        <ChevronDown
          className="faq-chevron w-5 h-5 text-gray-400 flex-shrink-0"
          data-open={String(open)}
        />
      </button>
      <div className="faq-content" data-open={String(open)}>
        <p className="pb-5 px-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
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

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0f] text-gray-900 dark:text-gray-100 selection:bg-violet-200 transition-colors duration-300">
      {/* ═══════════ NAVIGATION ═══════════ */}
      <nav
        className={`landing-nav fixed top-0 w-full z-50 ${
          navScrolled ? 'scrolled' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src="/images/logo_transparent.png"
                alt="SwiprCRM"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-bold text-[17px] tracking-tight text-gray-900 dark:text-white">
              SwiprCRM
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500 dark:text-gray-400">
            <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#about" className="hover:text-gray-900 dark:hover:text-white transition-colors">About Us</a>
            <a href="#pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-gray-900 dark:hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors hidden sm:block"
            >
              Login
            </Link>
            {ENABLE_SUBSCRIPTIONS ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-250 transition-colors"
              >
                Get Started
              </Link>
            ) : (
              <button
                disabled
                className="text-sm font-semibold bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 px-4 py-2 rounded-lg cursor-not-allowed"
              >
                Coming Soon
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="landing-hero-gradient pt-32 pb-0 px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-xs font-semibold uppercase tracking-wider mb-6"
            >
              <Zap className="w-3 h-3" />
              SWIPR
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={0.1}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-gray-900 dark:text-white mb-5"
            >
              High-velocity lead sorting
              <br />
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                tool for your sales team
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={0.2}
              className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed"
            >
              A keyboard-centric interface for sorting your leads. Flow state
              prospecting that turns lead management into a high-velocity
              workflow.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={0.3}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
            >
              {ENABLE_SUBSCRIPTIONS ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-all hover:shadow-lg hover:shadow-gray-900/20 w-full sm:w-auto justify-center"
                >
                  Get Started for free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 px-6 py-3 rounded-xl font-semibold text-sm cursor-not-allowed w-full sm:w-auto justify-center"
                >
                  Coming Soon
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <a
                href={SCHEDULE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all w-full sm:w-auto justify-center"
              >
                Book a Demo
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* ═══════════ VIDEO DEMO ═══════════ */}
        <div className="landing-cloud-bg pt-16 pb-20 -mt-4">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            className="max-w-5xl mx-auto px-6 relative z-10"
          >
            <div
              ref={videoContainerRef}
              className="rounded-2xl overflow-hidden border border-white/20 dark:border-white/10 shadow-2xl shadow-purple-900/40 bg-gray-900"
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
                      swiprcrm.vercel.app/dashboard
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
      <section id="features" className="py-24 px-6 bg-white dark:bg-gray-950 transition-colors">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">
                Features
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                Everything you need to scale
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-lg mx-auto">
                Scale operations without scaling headcount. Every feature
                designed for velocity.
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Zap className="w-6 h-6 text-amber-500" />,
                title: 'Timesaver',
                desc: 'Qualify leads, send follow-ups, update CRMs, and move deals forward in seconds.',
                bg: 'bg-amber-50 dark:bg-amber-950/20',
              },
              {
                icon: <Keyboard className="w-6 h-6 text-violet-500" />,
                title: 'Keyboard-Centric',
                desc: 'Every action can be initiated from a single keypress. No mouse required.',
                bg: 'bg-violet-50 dark:bg-violet-950/20',
              },
              {
                icon: <Layers className="w-6 h-6 text-blue-500" />,
                title: 'Unlimited Swipes',
                desc: 'No limits to how many leads you can process. Sort through thousands.',
                bg: 'bg-blue-50 dark:bg-blue-950/20',
              },
              {
                icon: <Activity className="w-6 h-6 text-emerald-500" />,
                title: 'Flow State',
                desc: 'A swipe-based experience that engages and reduces decision fatigue.',
                bg: 'bg-emerald-50 dark:bg-emerald-950/20',
              },
            ].map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.08}>
                <div className="group rounded-2xl border border-gray-100 dark:border-gray-900 p-6 hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-lg hover:shadow-violet-500/5 dark:hover:shadow-violet-500/2 transition-all duration-300">
                  <div
                    className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ ABOUT US ═══════════ */}
      <section id="about" className="py-24 px-6 bg-gray-50/80 dark:bg-gray-900/20 transition-colors">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                About Us
              </h2>
            </div>
          </Reveal>

          {/* Founder Story Quote */}
          <Reveal>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-150 dark:border-gray-800 p-8 md:p-10 mb-12 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-violet-600" />
              <div className="relative z-10">
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 block mb-3">Our Story</span>
                <blockquote className="text-lg md:text-xl font-medium text-gray-800 dark:text-gray-200 italic leading-relaxed mb-6">
                  &ldquo;During my time as an SDR, I found myself constantly feeling burned out by navigating and managing CRMs during prospecting. I built SwiprCRM to remove the friction, clutter, and endless clicking found in traditional CRMs.&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    RC
                  </div>
                  <div>
                    <cite className="not-italic font-semibold text-gray-900 dark:text-white block text-sm">Ronald Chiong</cite>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Founder, SwiprCRM</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Problems */}
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                  The Problems
                </h3>
                <ul className="space-y-4">
                  {PROBLEMS.map((problem) => (
                    <li
                      key={problem}
                      className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center flex-shrink-0 mt-0.5">
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
              <div className="rounded-2xl bg-gray-900 dark:bg-gray-950 p-8 text-white">
                <h3 className="text-lg font-bold mb-6">The Solution</h3>
                <ul className="space-y-4">
                  {SOLUTIONS.map((solution) => (
                    <li
                      key={solution}
                      className="flex items-start gap-3 text-sm text-gray-300 dark:text-gray-400"
                    >
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-violet-400" />
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
      <section id="pricing" className="py-24 px-6 bg-white dark:bg-gray-950 transition-colors">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">
                Pricing
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                Pricing
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-3">
                Simple, transparent pricing for teams of all sizes.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 items-start max-w-5xl mx-auto">
            {/* Individuals */}
            <Reveal delay={0.05}>
              <div className="pricing-card rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-7 flex flex-col">
                <div className="mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    AFFORDABLE FOR EARLY STAGE
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                  Individuals
                </h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    $15
                  </span>
                  <span className="text-gray-400 text-sm font-medium">
                    /mo
                  </span>
                </div>
                {ENABLE_SUBSCRIPTIONS ? (
                  <Link
                    href="/dashboard"
                    className="w-full py-2.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold text-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors mb-6"
                  >
                    GET STARTED
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-sm font-semibold text-center cursor-not-allowed mb-6"
                  >
                    COMING SOON
                  </button>
                )}
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
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
                      className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Teams — highlighted */}
            <Reveal delay={0.1}>
              <div className="pricing-card rounded-2xl border-2 border-violet-500 bg-white dark:bg-gray-900 p-7 flex flex-col relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-violet-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Featured
                  </span>
                </div>
                <div className="mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet-500">
                    PRIORITY ACCESS
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">Teams</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    $12
                  </span>
                  <span className="text-gray-400 text-sm font-medium">
                    /mo /seat
                  </span>
                </div>
                {ENABLE_SUBSCRIPTIONS ? (
                  <Link
                    href="/dashboard"
                    className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold text-center hover:bg-violet-700 transition-colors mb-6"
                  >
                    GET STARTED
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-sm font-semibold text-center cursor-not-allowed mb-6"
                  >
                    COMING SOON
                  </button>
                )}
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
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
                      className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Enterprise */}
            <Reveal delay={0.15}>
              <div className="pricing-card rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-7 flex flex-col">
                <div className="mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    FULL CUSTOMIZATION
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                  Enterprise
                </h3>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    Custom Pricing
                  </span>
                </div>
                <a
                  href={SCHEDULE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold text-center hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors mb-6"
                >
                  Contact Us
                </a>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                  INCLUDES:
                </p>
                <ul className="space-y-3 flex-1">
                  {['Custom Solutions', 'Dedicated Support', 'SLA Agreement'].map(
                    (item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400"
                      >
                        <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
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
      <section id="faq" className="py-24 px-6 bg-gray-50/80 dark:bg-gray-900/20 transition-colors">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                Frequently
                <br />
                Asked Questions
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 divide-y divide-gray-100 dark:divide-gray-800">
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
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-16 px-6 transition-colors">
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
                <span className="font-bold text-[15px] tracking-tight text-gray-900 dark:text-white">
                  SwiprCRM
                </span>
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
                High-velocity lead management for modern sales teams.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                Product
              </p>
              <ul className="space-y-2.5 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">Dashboard</Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                Company
              </p>
              <ul className="space-y-2.5 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <a href="#about" className="hover:text-gray-900 dark:hover:text-white transition-colors">About</a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-gray-900 dark:hover:text-white transition-colors">FAQ</a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                Contact
              </p>
              <ul className="space-y-2.5 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <a
                    href="mailto:ronaldchiong2005@gmail.com"
                    className="hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Email Us
                  </a>
                </li>
                <li>
                  <a
                    href={SCHEDULE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Book a Call
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              © {new Date().getFullYear()} SwiprCRM. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="mailto:ronaldchiong2005@gmail.com"
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/swiprcrm/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
