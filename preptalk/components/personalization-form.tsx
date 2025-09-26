"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Target, AlertCircle, User, FileText } from "lucide-react"
import { CVUpload } from "@/components/cv-upload"
import { CVAnalysis } from "@/lib/schemas/cv-analysis"

const formSchema = z.object({
  focusArea: z.enum(["career_transition", "leadership_stories", "technical_bridge", "industry_switch"], {
    required_error: "Please select what you'd like to focus on",
  }),
  concern: z.enum(["industry_knowledge", "leadership_experience", "culture_fit", "role_complexity"], {
    required_error: "Please select your main concern",
  }),
  background: z.string().max(200, "Background must be less than 200 characters").optional(),
})

export type PersonalizationData = z.infer<typeof formSchema> & {
  cvAnalysis?: CVAnalysis
  cvInsights?: any
}

interface PersonalizationFormProps {
  jobData: {
    title: string
    company: string
    industry?: string
  }
  onSubmit: (data: PersonalizationData) => void
  onSkip: () => void
  isLoading?: boolean
}

const focusAreaOptions = [
  {
    value: "career_transition" as const,
    label: "Practice career transition story",
    icon: "🔄",
    description: "Help articulating your career pivot and motivation"
  },
  {
    value: "leadership_stories" as const,
    label: "Practice leadership examples",
    icon: "👥",
    description: "Develop compelling leadership and teamwork stories"
  },
  {
    value: "technical_bridge" as const,
    label: "Bridge technical to business",
    icon: "🔧",
    description: "Connect technical background to business value"
  },
  {
    value: "industry_switch" as const,
    label: "Navigate industry switch",
    icon: "🏭",
    description: "Address industry knowledge gaps confidently"
  }
]

const concernOptions = [
  {
    value: "industry_knowledge" as const,
    label: "Limited industry knowledge",
    icon: "📚",
    description: "Worried about not knowing enough about this industry"
  },
  {
    value: "leadership_experience" as const,
    label: "No formal leadership experience",
    icon: "🎖️",
    description: "Concerned about lack of management or team lead experience"
  },
  {
    value: "culture_fit" as const,
    label: "Company culture fit concerns",
    icon: "🤝",
    description: "Unsure if you'll fit in with company culture and values"
  },
  {
    value: "role_complexity" as const,
    label: "Role feels too senior/complex",
    icon: "🎯",
    description: "Worried the position might be above your experience level"
  }
]

export function PersonalizationForm({ jobData, onSubmit, onSkip, isLoading = false }: PersonalizationFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showCVUpload, setShowCVUpload] = useState(false)
  const [cvData, setCVData] = useState<{ analysis?: CVAnalysis, insights?: any } | null>(null)

  const form = useForm<PersonalizationData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      focusArea: undefined,
      concern: undefined,
      background: "",
    },
  })

  function handleSubmit(values: PersonalizationData) {
    onSubmit({
      ...values,
      cvAnalysis: cvData?.analysis,
      cvInsights: cvData?.insights
    })
  }

  const handleCVUpload = (data: any) => {
    setCVData({
      analysis: data,
      insights: data.insights
    })
    setShowCVUpload(false)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Make Your Prep Personal</h1>
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Badge variant="secondary" className="px-3 py-1">
            {jobData.company}
          </Badge>
          <span>•</span>
          <span>{jobData.title}</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Help us tailor your interview preparation to your specific background and concerns.
          This takes 30 seconds and dramatically improves your prep quality.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Personalization Questions
          </CardTitle>
          <CardDescription>
            Your answers will help us create personas and questions that match your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">

              {/* Focus Area Selection */}
              <FormField
                control={form.control}
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

              {/* Concern Selection */}
              <FormField
                control={form.control}
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

              {/* Optional CV Upload */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCVUpload(!showCVUpload)}
                    className="text-sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {showCVUpload ? 'Hide' : 'Upload'} CV for better personalization
                    {cvData && <Badge variant="secondary" className="ml-2">CV Uploaded</Badge>}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {showAdvanced ? 'Hide' : 'Add'} background info
                  </Button>
                </div>

                {showCVUpload && (
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <CVUpload
                      onUploadComplete={handleCVUpload}
                      className="max-w-full"
                    />
                    {cvData && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          ✓ CV analyzed: {cvData.analysis?.personalInfo?.fullName} •
                          {cvData.analysis?.summary?.yearsOfExperience} years experience
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {showAdvanced && (
                  <FormField
                    control={form.control}
                    name="background"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brief background context</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., Currently in finance, interested in upstream energy transition..."
                            className="resize-none min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          1-2 sentences about your background to help personalize your prep even further
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSkip}
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
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Your Prep...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Personalized Prep
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Why personalize?</h3>
              <p className="text-sm text-muted-foreground">
                Personalized prep generates interviewer personas who understand your background,
                questions that let you practice your focus areas, and coaching that addresses
                your specific concerns. Users report 40% higher confidence after personalized prep.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}