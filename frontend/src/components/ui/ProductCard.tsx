import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Product } from '../../types'
import { useCartStore } from '../../lib/store'
import { useMoney } from '../../lib/currency'
import { useCategoryName, useT } from '../../lib/i18n'
import ImageWithFallback from './ImageWithFallback'
import { gsap, useGSAP } from '../../lib/gsap'

interface ProductCardProps {
  product: Product
  className?: string
}

export default function ProductCard({ product, className = '' }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const t = useT()
  const categoryName = useCategoryName()
  const { money, alt } = useMoney()
  const cardRef = useRef<HTMLDivElement>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const arrowRef = useRef<HTMLImageElement>(null)

  useGSAP(() => {
    if (!cardRef.current || !imageWrapRef.current || !buttonRef.current || !arrowRef.current) return

    const card = cardRef.current
    const imageWrap = imageWrapRef.current
    const button = buttonRef.current
    const arrow = arrowRef.current

    const moveX = gsap.quickTo(card, 'x', { duration: 0.35, ease: 'power3.out' })
    const moveY = gsap.quickTo(card, 'y', { duration: 0.35, ease: 'power3.out' })
    const rotateX = gsap.quickTo(card, 'rotationX', { duration: 0.35, ease: 'power3.out' })
    const rotateY = gsap.quickTo(card, 'rotationY', { duration: 0.35, ease: 'power3.out' })

    const handleMove = (event: MouseEvent) => {
      const bounds = card.getBoundingClientRect()
      const px = (event.clientX - bounds.left) / bounds.width - 0.5
      const py = (event.clientY - bounds.top) / bounds.height - 0.5

      moveX(px * 8)
      moveY(py * 8)
      rotateX(py * -5)
      rotateY(px * 5)

      gsap.to(imageWrap, {
        x: px * -12,
        y: py * -12,
        scale: 1.04,
        duration: 0.4,
        ease: 'power3.out',
      })
    }

    const handleEnter = () => {
      gsap.to(button, { y: -2, duration: 0.3, ease: 'power2.out' })
      gsap.to(arrow, { x: 4, y: -2, duration: 0.3, ease: 'power2.out' })
      gsap.to(card, { boxShadow: '0 18px 40px rgba(16,45,38,0.10)', duration: 0.35, ease: 'power3.out' })
    }

    const handleLeave = () => {
      moveX(0)
      moveY(0)
      rotateX(0)
      rotateY(0)
      gsap.to(imageWrap, { x: 0, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' })
      gsap.to(button, { y: 0, duration: 0.3, ease: 'power2.out' })
      gsap.to(arrow, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' })
      gsap.to(card, { boxShadow: '0 0 0 rgba(16,45,38,0)', duration: 0.35, ease: 'power3.out' })
    }

    card.addEventListener('mousemove', handleMove)
    card.addEventListener('mouseenter', handleEnter)
    card.addEventListener('mouseleave', handleLeave)

    return () => {
      card.removeEventListener('mousemove', handleMove)
      card.removeEventListener('mouseenter', handleEnter)
      card.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  return (
    <div ref={cardRef} className={`grid grid-cols-1 justify-center gap-4 transform-gpu [transform-style:preserve-3d] ${className}`}>
      <Link to={`/products/${product.slug}`} className="grid grid-cols-1 justify-center gap-4">
        <div ref={imageWrapRef} className="overflow-hidden rounded-[24px] border border-white bg-white/70 will-change-transform">
          <ImageWithFallback
            src={product.images[0]}
            alt={product.name}
            className="h-[325px] w-full object-cover"
            fallbackClassName="flex h-[325px] w-full items-center justify-center bg-[linear-gradient(180deg,#d7ede7,#c2ddd6)]"
            fallbackText={product.name}
          />
        </div>

        <div className="text-center">
          <h4 className="text__20 mb-[4px] font-medium text-Mneutral-900">
            {categoryName(product.category.slug, product.category.name)} · {product.tagline || product.name}
          </h4>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={13}
                strokeWidth={1.5}
                className={
                  star <= Math.round(Number(product.rating) || 0)
                    ? 'fill-current text-Mneutral-900'
                    : 'text-Mneutral-300'
                }
              />
            ))}
            {product.reviewCount > 0 && (
              <p className="text__14 text-Mneutral-900 opacity-50">({product.reviewCount})</p>
            )}
          </div>
        </div>
      </Link>

      <div className="text-center">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => addItem(product)}
          className="inline-flex items-center gap-2 rounded-full border border-Mneutral-900 px-[12px] py-[10px] text__14 transition-all duration-300 hover:bg-Mneutral-900 hover:text-white"
        >
          <span>{t('common.addToBag')} · {money(product.price)}</span>
          <img ref={arrowRef} src="/images/carbon_arrow-up-right (2).svg" alt="" className="h-4 w-4 will-change-transform" />
        </button>
        <p className="mt-2 text__12 tabular-nums text-Mneutral-400">{alt(product.price)}</p>
      </div>
    </div>
  )
}
