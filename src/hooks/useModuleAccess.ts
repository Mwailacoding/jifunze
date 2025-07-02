"use client"

import { useState, useEffect } from "react"
import { apiClient } from "../utils/api"
import { useNotification } from "../contexts/NotificationContext"

interface ModuleAccessInfo {
  hasAccess: boolean
  incompletePrerequisites: Array<{
    id: number
    title: string
    content_completed?: number
    content_count?: number
    quiz_passed?: boolean
    quiz_count?: number
  }>
  completionStatus: {
    is_completed: boolean
    content_completed: number
    content_count: number
    quiz_passed: boolean
    quiz_count: number
  }
}

export const useModuleAccess = (moduleId: number) => {
  const [accessInfo, setAccessInfo] = useState<ModuleAccessInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { showError } = useNotification()

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setIsLoading(true)
        const response = await apiClient.getModule(moduleId)

        // The API response type may not have 'access' property on 'Module', so we need to typecast or check more safely.
        // Assume the API returns a shape like:
        // { access: boolean, incomplete_prerequisites?: [], completion_status?: {} }
        const hasAccess = (response as any).access;
        if (hasAccess === false) {
          setAccessInfo({
            hasAccess: false,
            incompletePrerequisites: (response as any).incomplete_prerequisites || [],
            completionStatus: {
              is_completed: false,
              content_completed: 0,
              content_count: 0,
              quiz_passed: false,
              quiz_count: 0,
            },
          })
        } else {
          setAccessInfo({
            hasAccess: true,
            incompletePrerequisites: [],
            completionStatus: (response as any).completion_status || {
              is_completed: false,
              content_completed: 0,
              content_count: 0,
              quiz_passed: false,
              quiz_count: 0,
            },
          })
        }
      } catch (error) {
        showError("Error", "Failed to check module access")
        setAccessInfo({
          hasAccess: false,
          incompletePrerequisites: [],
          completionStatus: {
            is_completed: false,
            content_completed: 0,
            content_count: 0,
            quiz_passed: false,
            quiz_count: 0,
          },
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (moduleId) {
      checkAccess()
    }
  }, [moduleId, showError])

  return { accessInfo, isLoading }
}
