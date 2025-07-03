import type React from "react"
import { Link } from "react-router-dom"
import { BookOpen, Lock, CheckCircle2, Clock, Users, Star, Play } from "lucide-react"
import { ProgressBar } from "../../components/ui/ProgressBar"

interface ModuleCardProps {
  module: {
    id: number
    title: string
    description?: string
    category: string
    difficulty_level: string
    estimated_duration?: number
    has_access: boolean
    completion_status: {
      is_completed: boolean
      content_completed: number
      content_count: number
      quiz_passed: boolean
      quiz_count: number
    }
    incomplete_prerequisites: Array<{
      id: number
      title: string
    }>
  }
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ module }) => {
  const { completion_status } = module
  const completionPercentage =
    completion_status.content_count > 0
      ? Math.round((completion_status.content_completed / completion_status.content_count) * 100)
      : 0

  const getModuleStatus = () => {
    if (!module.has_access) return "locked"
    if (completion_status.is_completed) return "completed"
    if (completion_status.content_completed > 0) return "in-progress"
    return "not-started"
  }

  const status = getModuleStatus()

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-primary-100 text-primary-700"
      case "intermediate":
        return "bg-accent-100 text-accent-700"
      case "advanced":
        return "bg-red-100 text-red-700"
      default:
        return "bg-neutral-100 text-neutral-700"
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "locked":
        return <Lock className="w-5 h-5 text-neutral-400" />
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case "in-progress":
        return <Play className="w-5 h-5 text-accent-600" />
      default:
        return <BookOpen className="w-5 h-5 text-neutral-600" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "locked":
        return "bg-neutral-100"
      case "completed":
        return "bg-green-100"
      case "in-progress":
        return "bg-accent-100"
      default:
        return "bg-neutral-100"
    }
  }

  const CardContent = () => (
    <div className={`card card-hover overflow-hidden relative ${!module.has_access ? "opacity-75" : ""}`}>
      {/* Module Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(module.difficulty_level)}`}>
              {module.difficulty_level}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-neutral-900 mb-2 line-clamp-2">{module.title}</h3>

        {module.description && <p className="text-neutral-600 text-sm mb-3 line-clamp-2">{module.description}</p>}

        <div className="flex items-center space-x-4 text-sm text-neutral-500 mb-4">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{module.estimated_duration || 30} min</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{completion_status.content_count} lessons</span>
          </div>
        </div>

        {/* Access Status */}
        {!module.has_access && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center space-x-2 text-amber-800">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Prerequisites required</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Complete: {module.incomplete_prerequisites.map((p) => p.title).join(", ")}
            </p>
          </div>
        )}

        {/* Progress */}
        {module.has_access && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700">Progress</span>
              <span className="text-sm text-neutral-600">
                {completionPercentage}%
              </span>
            </div>
            <ProgressBar
              value={completionPercentage}
              color={status === "completed" ? "primary" : "secondary"}
              animated
            />
          </div>
        )}

        {/* Requirements */}
        {module.has_access && (
          <div className="mb-4">
            <div className="text-xs text-neutral-600 mb-1">Requirements to complete:</div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <CheckCircle2
                  className={`w-4 h-4 ${
                    completion_status.content_completed >= completion_status.content_count
                      ? "text-green-600"
                      : "text-neutral-300"
                  }`}
                />
                <span
                  className={`text-xs ${
                    completion_status.content_completed >= completion_status.content_count
                      ? "text-neutral-700"
                      : "text-neutral-400"
                  }`}
                >
                  Complete all content ({completion_status.content_completed}/{completion_status.content_count})
                </span>
              </div>
              {completion_status.quiz_count > 0 && (
                <div className="flex items-center space-x-2">
                  <CheckCircle2
                    className={`w-4 h-4 ${completion_status.quiz_passed ? "text-green-600" : "text-neutral-300"}`}
                  />
                  <span
                    className={`text-xs ${completion_status.quiz_passed ? "text-neutral-700" : "text-neutral-400"}`}
                  >
                    Pass the quiz
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Category */}
        <div className="mb-4">
          <span className="text-xs text-neutral-500 uppercase tracking-wide">{module.category}</span>
        </div>
      </div>

      {/* Module Footer */}
      <div className="px-6 pb-6">
        <div
          className={`w-full flex items-center justify-center space-x-2 ${
            !module.has_access
              ? "btn-outline opacity-50 cursor-not-allowed"
              : status === "completed"
                ? "btn-secondary"
                : status === "in-progress"
                  ? "btn-accent"
                  : "btn-primary"
          }`}
        >
          <Play className="w-4 h-4" />
          <span>
            {!module.has_access
              ? "Locked"
              : status === "completed"
                ? "Review"
                : status === "in-progress"
                  ? "Continue"
                  : "Start"}
          </span>
        </div>
      </div>
    </div>
  )

  return module.has_access ? (
    <Link to={`/modules/${module.id}`}>
      <CardContent />
    </Link>
  ) : (
    <CardContent />
  )
}
