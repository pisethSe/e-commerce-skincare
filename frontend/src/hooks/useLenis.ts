import { useEffect, useRef } from 'react'

export function useLenis() {
  const lenisRef = useRef<unknown>(null)

  useEffect(() => {
    // Keep native browser scrolling and gestures enabled.
    // This preserves trackpad back/forward navigation and pinch zoom.
    document.documentElement.classList.remove('lenis')
    document.body.style.removeProperty('overscroll-behavior')

    return () => {
      document.documentElement.classList.remove('lenis')
    }
  }, [])

  return lenisRef
}

// AOS initialization hook
export function useAOS() {
  useEffect(() => {
    // AOS is loaded via CDN
    if (typeof window !== 'undefined' && (window as unknown as { AOS?: { init: (opts: object) => void } }).AOS) {
      const w = window as unknown as { AOS: { init: (opts: object) => void } }
      w.AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 80,
      })
    }
  }, [])
}
