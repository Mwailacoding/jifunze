import type React from "react"
import { Lock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react"
import { Button } from "../../components/ui/Button"
import { Link } from "react-router-dom"
import { ProgressBar } from "../../components/ui/ProgressBar"

interface Prerequisite {
  id: number
  title: string
  content_completed?: number
  content_count?: number
  quiz_passed?: boolean
  quiz_count?: number
}

interface ModuleLockScreenProps {
  module: {
    id: number
    title: string
    description?: string
  }
  incompletePrerequisites: Prerequisite[]
}

export const ModuleLockScreen: React.FC<ModuleLockScreenProps> = ({ module, incompletePrerequisites }) => {
  return (
    <div className="card p-8 text-center max-w-2xl mx-auto">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600 mb-6">
        <Lock className="h-8 w-8" />
      </div>

      <h3 className="text-2xl font-semibold mb-3">Module Locked</h3>
      <p className="text-neutral-600 mb-8">
        You need to complete the following prerequisites to access <strong>{module.title}</strong>.
      </p>

      <div className="space-y-6 mb-8">
        {incompletePrerequisites.map((prereq, index) => {
          const contentProgress = prereq.content_count
            ? Math.round(((prereq.content_completed || 0) / prereq.content_count) * 100)
            : 0

          const contentComplete = (prereq.content_completed || 0) >= (prereq.content_count || 0)
          const quizComplete = prereq.quiz_count === 0 || prereq.quiz_passed
          const moduleComplete = contentComplete && quizComplete

          return (
            <div key={prereq.id} className="border rounded-lg p-6 text-left">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg text-neutral-900 mb-2">{prereq.title}</h4>

                  <div className="space-y-3">
                    {/* Content Progress */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {contentComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        )}
                        <span className="text-sm font-medium">Complete all content</span>
                      </div>
                      <span className="text-sm text-neutral-600">
                        {prereq.content_completed || 0} of {prereq.content_count || 0} lessons
                      </span>
                    </div>

                    {prereq.content_count && prereq.content_count > 0 && (
                      <ProgressBar
                        value={contentProgress}
                        color={contentComplete ? "primary" : "secondary"}
                        size="sm"
                      />
                    )}

                    {/* Quiz Progress */}
                    {prereq.quiz_count && prereq.quiz_count > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {quizComplete ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          )}
                          <span className="text-sm font-medium">Pass the module quiz</span>
                        </div>
                        <span className="text-sm text-neutral-600">{prereq.quiz_passed ? "Passed" : "Not passed"}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  {moduleComplete ? (
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/modules/${prereq.id}`}>
                        Continue <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button asChild variant="default">
          <Link to="/modules">Browse Available Modules</Link>
        </Button>

        {incompletePrerequisites.length === 1 && (
          <Button asChild variant="outline">
            <Link to={`/modules/${incompletePrerequisites[0].id}`}>Go to {incompletePrerequisites[0].title}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
