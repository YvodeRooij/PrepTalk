"use client"

import { useState } from "react"
import { PersonalizationForm, type PersonalizationData } from "./personalization-form"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Globe, Users, BookOpen, Target, ArrowRight, Loader2 } from "lucide-react"

type Step = 'job_input' | 'personalization' | 'generating' | 'results'

interface JobData {
  title: string
  company: string
  industry?: string
  level?: string
  url?: string
  description?: string
}

interface CurriculumData {
  id: string
  rounds: Array<{
    roundNumber: number
    roundType: string
    title: string
    persona: {
      name: string
      role: string
      style: string[]
    }
    questionCount: number
  }>
  personalizationSummary?: {
    focusArea: string
    concern: string
    adaptationsApplied: string[]
  }
}

export function CurriculumGenerator() {
  const [step, setStep] = useState<Step>('job_input')
  const [jobData, setJobData] = useState<JobData | null>(null)
  const [userProfile, setUserProfile] = useState<PersonalizationData | null>(null)
  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  // Job input form state
  const [jobUrl, setJobUrl] = useState("")
  const [jobDescription, setJobDescription] = useState("")

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Simulate job parsing
      setProgress(30)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock parsed job data
      const parsed: JobData = {
        title: jobUrl.includes('shell') ? 'Graduate Program - Upstream' : 'Software Engineer',
        company: jobUrl.includes('shell') ? 'Shell' : 'Company Name',
        industry: jobUrl.includes('shell') ? 'Energy/Oil & Gas' : 'Technology',
        level: 'Entry-Mid Level',
        url: jobUrl || undefined,
        description: jobDescription || undefined
      }

      setJobData(parsed)
      setStep('personalization')
    } catch (err) {
      setError('Failed to parse job information. Please try again.')
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }

  const handlePersonalizationSubmit = async (data: PersonalizationData) => {
    setUserProfile(data)
    setIsLoading(true)
    setStep('generating')

    try {
      // Simulate curriculum generation with progress updates
      const steps = [
        { progress: 20, message: 'Analyzing job requirements...' },
        { progress: 40, message: 'Researching company & competitors...' },
        { progress: 60, message: 'Creating personalized personas...' },
        { progress: 80, message: 'Generating adaptive questions...' },
        { progress: 100, message: 'Building your prep guides...' }
      ]

      for (const step of steps) {
        setProgress(step.progress)
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      // Mock curriculum result with personalization
      const generatedCurriculum: CurriculumData = {
        id: 'curr_' + Math.random().toString(36).substr(2, 9),
        rounds: [
          {
            roundNumber: 1,
            roundType: 'recruiter_screen',
            title: 'Recruiter Screen',
            persona: {
              name: 'Sarah Chen',
              role: 'Energy Sector Recruiter at Shell',
              style: data.focusArea === 'career_transition'
                ? ['encouraging', 'transition-supportive', 'curious']
                : ['professional', 'thorough', 'efficient']
            },
            questionCount: 10
          },
          {
            roundNumber: 2,
            roundType: 'behavioral_deep_dive',
            title: 'Behavioral Deep Dive',
            persona: {
              name: 'Michael Rodriguez',
              role: 'Senior Manager - Upstream Operations',
              style: data.concern === 'leadership_experience'
                ? ['supportive', 'competency-focused', 'developmental']
                : ['analytical', 'detail-oriented', 'experienced']
            },
            questionCount: 10
          },
          {
            roundNumber: 3,
            roundType: 'culture_values_alignment',
            title: 'Culture & Values Alignment',
            persona: {
              name: 'Emma Thompson',
              role: 'Team Lead - Sustainability & Innovation',
              style: data.concern === 'culture_fit'
                ? ['collaborative', 'values-driven', 'inclusive']
                : ['values-driven', 'collaborative', 'perceptive']
            },
            questionCount: 10
          },
          {
            roundNumber: 4,
            roundType: 'strategic_role_discussion',
            title: 'Strategic Role Discussion',
            persona: {
              name: 'David Kim',
              role: 'Director - Future Energy',
              style: data.concern === 'role_complexity'
                ? ['strategic', 'accessible', 'mentoring']
                : ['strategic', 'business-focused', 'forward-thinking']
            },
            questionCount: 10
          },
          {
            roundNumber: 5,
            roundType: 'executive_final',
            title: 'Executive Final',
            persona: {
              name: 'Lisa Johnson',
              role: 'VP - Upstream Development',
              style: ['visionary', 'leadership-focused', 'decisive']
            },
            questionCount: 10
          }
        ],
        personalizationSummary: {
          focusArea: data.focusArea,
          concern: data.concern,
          adaptationsApplied: [
            'Personas adapted to your background',
            'Questions emphasize your focus area',
            'Coaching addresses your main concern',
            'Natural competitive intelligence integration'
          ]
        }
      }

      setCurriculum(generatedCurriculum)
      setStep('results')
    } catch (err) {
      setError('Failed to generate curriculum. Please try again.')
      setStep('personalization')
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }

  const handleSkipPersonalization = () => {
    // Generate non-personalized curriculum
    setUserProfile(null)
    handlePersonalizationSubmit({
      focusArea: 'career_transition',
      concern: 'industry_knowledge',
      background: ''
    })
  }

  const getFocusAreaLabel = (focusArea: string) => {
    const labels = {
      career_transition: 'Career Transition',
      leadership_stories: 'Leadership Examples',
      technical_bridge: 'Technical to Business',
      industry_switch: 'Industry Switch'
    }
    return labels[focusArea as keyof typeof labels] || focusArea
  }

  const getConcernLabel = (concern: string) => {
    const labels = {
      industry_knowledge: 'Industry Knowledge',
      leadership_experience: 'Leadership Experience',
      culture_fit: 'Culture Fit',
      role_complexity: 'Role Complexity'
    }
    return labels[concern as keyof typeof labels] || concern
  }

  if (step === 'job_input') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Interview Prep Generator</h1>
          <p className="text-muted-foreground">
            Generate personalized interview preparation for any role
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>
              Enter a job URL or paste the job description to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJobSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobUrl">Job URL</Label>
                <Input
                  id="jobUrl"
                  placeholder="https://careers.shell.com/jobs/..."
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                />
              </div>

              <div className="text-center text-sm text-muted-foreground">or</div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Paste the job description here..."
                  className="min-h-[120px]"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || (!jobUrl && !jobDescription)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Job...
                  </>
                ) : (
                  <>
                    Start Prep Generation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'personalization' && jobData) {
    return (
      <PersonalizationForm
        jobData={jobData}
        onSubmit={handlePersonalizationSubmit}
        onSkip={handleSkipPersonalization}
        isLoading={isLoading}
      />
    )
  }

  if (step === 'generating') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Creating Your Personalized Prep...</CardTitle>
            <CardDescription className="text-center">
              This should take about 30 seconds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className={`h-5 w-5 ${progress >= 20 ? 'text-green-500' : 'text-gray-300'}`} />
                <span className="text-sm">Analyzing job requirements</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className={`h-5 w-5 ${progress >= 40 ? 'text-green-500' : 'text-gray-300'}`} />
                <span className="text-sm">Researching company & competitors</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className={`h-5 w-5 ${progress >= 60 ? 'text-green-500' : 'text-gray-300'}`} />
                <span className="text-sm">Creating personalized personas</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className={`h-5 w-5 ${progress >= 80 ? 'text-green-500' : 'text-gray-300'}`} />
                <span className="text-sm">Generating adaptive questions</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className={`h-5 w-5 ${progress >= 100 ? 'text-green-500' : 'text-gray-300'}`} />
                <span className="text-sm">Building your prep guides</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'results' && curriculum && jobData) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Your Personalized Interview Prep</h1>
          <div className="flex items-center justify-center gap-3">
            <Badge variant="secondary" className="px-4 py-2">
              {jobData.company}
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-lg">{jobData.title}</span>
          </div>

          {userProfile && (
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>Focus: {getFocusAreaLabel(userProfile.focusArea)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>Concern: {getConcernLabel(userProfile.concern)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Personalization Summary */}
        {curriculum.personalizationSummary && (
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold">Personalization Applied</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {curriculum.personalizationSummary.adaptationsApplied.map((adaptation, i) => (
                      <li key={i}>• {adaptation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Curriculum Rounds */}
        <div className="grid gap-4">
          <h2 className="text-2xl font-bold mb-4">5 Interview Rounds</h2>
          {curriculum.rounds.map((round) => (
            <Card key={round.roundNumber} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Round {round.roundNumber}</Badge>
                      <h3 className="font-semibold text-lg">{round.title}</h3>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <span className="font-medium">{round.persona.name}</span> - {round.persona.role}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <div className="flex gap-1">
                          {round.persona.style.map((trait, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{round.questionCount} adaptive questions</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline">
                    Practice Round {round.roundNumber}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center pt-6">
          <Button size="lg">
            Start Practice Session
          </Button>
          <Button variant="outline" size="lg">
            View Full Curriculum
          </Button>
        </div>
      </div>
    )
  }

  return null
}