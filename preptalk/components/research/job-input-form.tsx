"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, Sparkles, Target, Globe, CheckCircle, ArrowRight } from "lucide-react"

// Job input schema
const jobInputSchema = z.object({
  input: z.string().min(1, "Please provide a job URL or description"),
  inputType: z.enum(["url", "description"]),
})

// Personalization schema
const personalizationSchema = z.object({
  focusArea: z.enum(["career_transition", "leadership_stories", "technical_bridge", "industry_switch"]),
  concern: z.enum(["industry_knowledge", "leadership_experience", "culture_fit", "role_complexity"]),
  background: z.string().max(200).optional(),
})

type JobInputData = z.infer<typeof jobInputSchema>
type PersonalizationData = z.infer<typeof personalizationSchema>

interface JobInputFormProps {
  onSuccess?: (curriculumId: string) => void
  onError?: (error: string) => void
}

type Step = 'job_input' | 'personalization' | 'generating' | 'success' | 'error'

const focusAreaOptions = [
  {
    value: "career_transition" as const,
    label: "Career transition story",
    icon: "🔄",
    description: "Practice articulating career changes"
  },
  {
    value: "leadership_stories" as const,
    label: "Leadership examples",
    icon: "👥",
    description: "Develop leadership and teamwork stories"
  },
  {
    value: "technical_bridge" as const,
    label: "Technical to business bridge",
    icon: "🔧",
    description: "Connect technical skills to business value"
  },
  {
    value: "industry_switch" as const,
    label: "Industry knowledge gaps",
    icon: "🏭",
    description: "Address industry transition concerns"
  }
]

const concernOptions = [
  {
    value: "industry_knowledge" as const,
    label: "Limited industry knowledge",
    icon: "📚",
    description: "Worried about industry expertise"
  },
  {
    value: "leadership_experience" as const,
    label: "No formal leadership experience",
    icon: "🎖️",
    description: "Concerned about leadership questions"
  },
  {
    value: "culture_fit" as const,
    label: "Company culture fit",
    icon: "🤝",
    description: "Unsure about cultural alignment"
  },
  {
    value: "role_complexity" as const,
    label: "Role feels too senior",
    icon: "🎯",
    description: "Worried about role complexity"
  }
]

export function JobInputForm({ onSuccess, onError }: JobInputFormProps) {
  const [step, setStep] = useState<Step>('job_input')
  const [jobData, setJobData] = useState<JobInputData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [curriculumId, setCurriculumId] = useState<string | null>(null)

  // Function to fetch the latest CV data for the user
  const fetchLatestCVData = async () => {
    try {
      const supabase = createClient()

      // Fetch the most recent CV analysis for the user
      const { data: cvAnalysis, error } = await supabase
        .from('cv_analyses')
        .select('*')
        .eq('user_id', '6a3ba98b-8b91-4ba0-b517-8afe6a5787ee')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !cvAnalysis) {
        console.warn('No CV data found for user:', error?.message)
        return null
      }

      // Transform the database record to match the expected format
      return {
        analysis: cvAnalysis.analysis,
        insights: cvAnalysis.insights,
        cv_analysis_id: cvAnalysis.id,
        matchScore: cvAnalysis.match_score || undefined
      }
    } catch (error) {
      console.error('Error fetching CV data:', error)
      return null
    }
  }

  // Job input form
  const jobForm = useForm<JobInputData>({
    resolver: zodResolver(jobInputSchema),
    defaultValues: {
      input: "",
      inputType: "url"
    }
  })

  // Personalization form
  const personalizationForm = useForm<PersonalizationData>({
    resolver: zodResolver(personalizationSchema),
    defaultValues: {
      focusArea: undefined,
      concern: undefined,
      background: ""
    }
  })

  const handleJobSubmit = (values: JobInputData) => {
    setJobData(values)
    setStep('personalization')
  }

  const handlePersonalizationSubmit = async (personalizationData: PersonalizationData) => {
    if (!jobData) return

    setIsLoading(true)
    setError(null)
    setStep('generating')

    try {
      // Simulate progress updates
      const progressSteps = [
        { progress: 20, delay: 500 },
        { progress: 40, delay: 1000 },
        { progress: 60, delay: 1500 },
        { progress: 80, delay: 1000 },
        { progress: 100, delay: 800 }
      ]

      for (const { progress: prog, delay } of progressSteps) {
        setProgress(prog)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Fetch the latest CV data for the user
      const cvData = await fetchLatestCVData()

      // Call the real API with CV data included
      const response = await fetch('/api/curriculum/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: jobData.input,
          userProfile: personalizationData,
          cvData: cvData // ✅ Include CV data in the request
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate curriculum')
      }

      setCurriculumId(result.curriculum_id)
      setStep('success')
      onSuccess?.(result.curriculum_id)

    } catch (error) {
      console.error('Curriculum generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
      setStep('error')
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }

  const handleSkipPersonalization = () => {
    handlePersonalizationSubmit({
      focusArea: 'career_transition',
      concern: 'industry_knowledge',
      background: ''
    })
  }

  if (step === 'job_input') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Job Details
          </CardTitle>
          <CardDescription>
            Enter a job URL or paste the job description to start generating your personalized interview prep
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...jobForm}>
            <form onSubmit={jobForm.handleSubmit(handleJobSubmit)} className="space-y-4">
              <FormField
                control={jobForm.control}
                name="inputType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Input Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="url" id="url" />
                          <label htmlFor="url">Job URL</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="description" id="description" />
                          <label htmlFor="description">Job Description</label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={jobForm.control}
                name="input"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {jobForm.watch('inputType') === 'url' ? 'Job URL' : 'Job Description'}
                    </FormLabel>
                    <FormControl>
                      {jobForm.watch('inputType') === 'url' ? (
                        <Input
                          placeholder="https://careers.company.com/jobs/..."
                          {...field}
                        />
                      ) : (
                        <Textarea
                          placeholder="Paste the complete job description here..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" size="lg">
                Continue to Personalization
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    )
  }

  if (step === 'personalization' && jobData) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">Make Your Prep Personal</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Help us tailor your interview preparation to your specific background and concerns.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Personalization Questions
            </CardTitle>
            <CardDescription>
              Your answers will create personas and questions that match your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...personalizationForm}>
              <form onSubmit={personalizationForm.handleSubmit(handlePersonalizationSubmit)} className="space-y-8">

                <FormField
                  control={personalizationForm.control}
                  name="focusArea"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-base font-semibold">
                        What would you like to focus on most?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          {focusAreaOptions.map((option) => (
                            <div key={option.value} className="relative">
                              <RadioGroupItem
                                value={option.value}
                                id={option.value}
                                className="peer sr-only"
                              />
                              <label
                                htmlFor={option.value}
                                className="flex flex-col p-4 rounded-lg border cursor-pointer hover:bg-muted/50 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:dark:bg-blue-950 transition-colors"
                              >
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-lg">{option.icon}</span>
                                  <span className="font-medium">{option.label}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {option.description}
                                </span>
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={personalizationForm.control}
                  name="concern"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-base font-semibold">
                        What's your biggest interview concern?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          {concernOptions.map((option) => (
                            <div key={option.value} className="relative">
                              <RadioGroupItem
                                value={option.value}
                                id={option.value}
                                className="peer sr-only"
                              />
                              <label
                                htmlFor={option.value}
                                className="flex flex-col p-4 rounded-lg border cursor-pointer hover:bg-muted/50 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:dark:bg-blue-950 transition-colors"
                              >
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-lg">{option.icon}</span>
                                  <span className="font-medium">{option.label}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {option.description}
                                </span>
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={personalizationForm.control}
                  name="background"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brief background (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Currently in finance, transitioning to tech..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        1-2 sentences about your background to personalize your prep further
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSkipPersonalization}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Skip Personalization
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Personalized Prep
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'generating') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Creating Your Personalized Prep...</CardTitle>
          <CardDescription className="text-center">
            This should take about 30-60 seconds
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
    )
  }

  if (step === 'success' && curriculumId) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Personalized Prep Created!</h3>
              <p className="text-muted-foreground">
                Your curriculum has been generated with personalized personas and adaptive questions.
              </p>
            </div>
            <Button size="lg" className="w-full">
              View Your Curriculum
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'error') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Generation Failed</h3>
              <p className="text-red-600">{error}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setStep('job_input')}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
