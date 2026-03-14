import React, { useEffect, useState } from 'react'

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string
  fallbackText?: string
}

export default function ImageWithFallback({
  src,
  alt = '',
  className = '',
  fallbackClassName = '',
  fallbackText = 'Image unavailable',
  onError,
  loading,
  ...props
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(!src)

  useEffect(() => {
    setHasError(!src)
  }, [src])

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackText}
        className={fallbackClassName || className}
      >
        <span className="px-4 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-charcoal-400">
          {fallbackText}
        </span>
      </div>
    )
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      loading={loading ?? 'lazy'}
      className={className}
      onError={(event) => {
        setHasError(true)
        onError?.(event)
      }}
    />
  )
}
