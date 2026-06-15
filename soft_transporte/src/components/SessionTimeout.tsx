'use client'

import { useEffect } from 'react'
import { logout } from '@/app/actions/auth'

export function SessionTimeout() {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const resetTimeout = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(async () => {
        try {
          await logout()
        } catch (error) {
          // Next.js redirect throws an error internally, this is expected
        }
      }, 10 * 60 * 1000) // 10 minutos
    }

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']

    events.forEach(event => {
      window.addEventListener(event, resetTimeout)
    })

    resetTimeout()

    return () => {
      clearTimeout(timeoutId)
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout)
      })
    }
  }, [])

  return null
}
