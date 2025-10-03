'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [jobUrl, setJobUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userCount, setUserCount] = useState(9876)
  const [reviewCount, setReviewCount] = useState(2847)
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()

  // Animate numbers on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setUserCount(10000)
      setReviewCount(2847)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobUrl.trim()) return

    setIsLoading(true)
    // TODO(human): Implement the job URL processing logic
    // For now, redirect to signup with the job URL as a query param
    router.push(`/signup?job=${encodeURIComponent(jobUrl)}`)
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Minimal Navigation Bar */}
  <nav className="fixed top-0 w-full bg-white shadow-sm border-b border-neutral-100 z-50 animate-fade-in">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-neutral-950">
              PrepTalk
            </Link>
            <div className="flex items-center gap-8">
              <Link href="#how-it-works" className="text-neutral-600 hover:text-neutral-950 text-sm font-medium hidden sm:block">
                How it Works
              </Link>
              <Link href="#pricing" className="text-neutral-600 hover:text-neutral-950 text-sm font-medium hidden sm:block">
                Pricing
              </Link>
              <Link href="/login" className="text-primary-600 hover:text-primary-700 text-sm font-semibold">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section: full viewport with generous whitespace */}
      <section className="relative px-6 sm:px-8 lg:px-12 py-20 lg:py-28">
        {/* Subtle background gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white via-white to-neutral-50" />

        <div className="max-w-7xl mx-auto min-h-[calc(100vh-200px)] grid lg:grid-cols-12 gap-10 items-center">
          {/* Left: Headline and CTA */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm mb-5 animate-fade-in">
              <span className="h-2 w-2 rounded-full bg-success-500" /> Live practice in progress
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-neutral-950 tracking-tight mb-4 animate-fade-in">
              Ace Your Dream Job Interview
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              Practice with a realistic interview simulator and get actionable feedback—tailored to your role.
            </p>

            {/* Input + CTAs */}
            <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="relative max-w-xl">
                <input
                  type="text"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="🔗 Paste job URL or type Company + Role"
                  className="input-primary h-14 pr-36"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !jobUrl.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-11 px-5 rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 transition"
                >
                  {isLoading ? 'Processing…' : 'Start free'}
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-neutral-600">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-neutral-700 hover:text-neutral-950"
                  onClick={() => videoRef.current?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 5v14l11-7z"/></svg>
                  Watch demo
                </button>
                <span className="h-1 w-1 rounded-full bg-neutral-300" />
                <span>No card required</span>
              </div>
            </form>

            {/* Social proof */}
            <div className="mt-10 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <p className="text-neutral-600">
                Join <span className="font-semibold text-neutral-950 tabular-nums">{userCount.toLocaleString()}+</span> who landed their dream jobs
              </p>
              <div className="mt-2 flex items-center gap-2 text-neutral-600">
                <span className="text-warning-500">★★★★★</span>
                <span>4.9/5 from {reviewCount.toLocaleString()} reviews</span>
              </div>
            </div>
          </div>

          {/* Right: Video / Visual */}
          <div className="lg:col-span-6">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 shadow-2xl animate-fade-in-up">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary-200/20 via-transparent to-success-200/20 rounded-3xl blur-2xl -z-10" />
              <video
                ref={videoRef}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                poster="/demo-poster.jpg"
              >
                <source src="/demo-interview.mp4" type="video/mp4" />
              </video>
              <div className="absolute bottom-4 left-4">
                <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-neutral-700 border border-neutral-200 shadow-sm">
                  Interview demo
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="hidden lg:flex justify-center mt-16 animate-bounce" aria-hidden>
          <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Below the fold - Progressive disclosure */}
      <div className="bg-neutral-50 py-24 md:py-28" id="how-it-works">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl font-bold text-center text-neutral-950 mb-14">How PrepTalk Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl hover:bg-white hover:shadow-md transition">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-950 mb-2">Paste Job URL</h3>
              <p className="text-neutral-600">Share the job posting and we’ll analyze requirements instantly</p>
            </div>
            <div className="text-center p-6 rounded-2xl hover:bg-white hover:shadow-md transition">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-950 mb-2">Practice Interviews</h3>
              <p className="text-neutral-600">Voice-based mock interviews tailored to your specific role</p>
            </div>
            <div className="text-center p-6 rounded-2xl hover:bg-white hover:shadow-md transition">
              <div className="w-16 h-16 bg-success-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-success-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-950 mb-2">Get Feedback</h3>
              <p className="text-neutral-600">Receive detailed analysis and actionable improvements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-24 md:py-28" id="pricing">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-950 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-neutral-600">Start with 1 free interview. No subscription required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto items-stretch">
            <div className="bg-white border-2 border-neutral-200 rounded-2xl p-8 hover:border-primary-300 transition-colors shadow-sm flex flex-col">
              <h3 className="text-xl font-semibold mb-4">Free Trial</h3>
              <div className="text-4xl font-bold text-neutral-950 mb-2">$0</div>
              <div className="text-neutral-600 mb-6">1 Interview</div>
              <ul className="space-y-3 text-neutral-600 flex-1">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full mock interview
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Detailed feedback
                </li>
              </ul>
              <div className="mt-6">
                <Link href="/signup" className="inline-flex items-center font-semibold text-primary-600 hover:text-primary-700">
                  Get started →
                </Link>
              </div>
            </div>
            <div className="bg-white border-2 border-primary-500 rounded-2xl p-8 relative transform scale-105 shadow-xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Basic</h3>
              <div className="text-4xl font-bold text-neutral-950 mb-2">$29</div>
              <div className="text-neutral-600 mb-6">5 Interviews/month</div>
              <ul className="space-y-3 text-neutral-600">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Everything in Free
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Company-specific prep
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Progress tracking
                </li>
              </ul>
              <div className="mt-6">
                <Link href="/signup" className="btn-primary inline-flex items-center">Choose Basic</Link>
              </div>
            </div>
            <div className="bg-white border-2 border-neutral-200 rounded-2xl p-8 hover:border-primary-300 transition-colors shadow-sm flex flex-col">
              <h3 className="text-xl font-semibold mb-4">Premium</h3>
              <div className="text-4xl font-bold text-neutral-950 mb-2">$79</div>
              <div className="text-neutral-600 mb-6">20 Interviews/month</div>
              <ul className="space-y-3 text-neutral-600 flex-1">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Everything in Basic
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority processing
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  1-on-1 coach support
                </li>
              </ul>
              <div className="mt-6">
                <Link href="/signup" className="inline-flex items-center font-semibold text-primary-600 hover:text-primary-700">
                  Choose Premium →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-neutral-50 border-t border-neutral-200 py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-4 sm:mb-0">
              <p className="text-neutral-600">© 2025 PrepTalk. All rights reserved.</p>
            </div>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-neutral-600 hover:text-neutral-950 text-sm">
                Privacy
              </Link>
              <Link href="/terms" className="text-neutral-600 hover:text-neutral-950 text-sm">
                Terms
              </Link>
              <Link href="/contact" className="text-neutral-600 hover:text-neutral-950 text-sm">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
