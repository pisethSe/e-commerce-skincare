import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import CartSidebar from './CartSidebar'
import AuthModal from '../auth/AuthModal'
import { useLenis } from '../../hooks/useLenis'
import { gsap } from '../../lib/gsap'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  useLenis()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    if (!mainRef.current) return

    gsap.fromTo(
      mainRef.current,
      { autoAlpha: 0, y: 18 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.75,
        ease: 'power3.out',
        clearProps: 'transform',
      }
    )
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-cream-50">
      <Navbar />
      <CartSidebar />
      <AuthModal />
      <main ref={mainRef} key={location.pathname}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
