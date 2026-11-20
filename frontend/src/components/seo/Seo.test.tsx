import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import Seo from './Seo'

describe('Seo', () => {
  it('sets the title, description, canonical, social tags, and JSON-LD', () => {
    render(
      <Seo
        title="Calesta — Test Product"
        description="A test product"
        image="https://calesta.kh/product.jpg"
        type="product"
        jsonLd={{ '@type': 'Product', name: 'Test Product' }}
      />,
    )

    expect(document.title).toBe('Calesta — Test Product')
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('A test product')
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Calesta — Test Product')
    expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('product')
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://calesta.kh/product.jpg')
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain('/')
    expect(document.getElementById('calesta-jsonld')?.textContent).toContain('Test Product')
  })
})
