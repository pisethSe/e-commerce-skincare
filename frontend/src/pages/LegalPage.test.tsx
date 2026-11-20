import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LegalPage, { type LegalKind } from './LegalPage'

function renderLegal(kind: LegalKind) {
  return render(
    <MemoryRouter>
      <LegalPage kind={kind} />
    </MemoryRouter>,
  )
}

describe('LegalPage', () => {
  it('renders the privacy policy and links to the other policies', () => {
    renderLegal('privacy')

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
    expect(screen.getByText(/collects only the information needed/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: 'Shipping & Returns' })).toHaveAttribute('href', '/shipping-returns')
    expect(document.title).toBe('Calesta — Privacy Policy')
  })

  it('renders the terms of service', () => {
    renderLegal('terms')

    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument()
    expect(screen.getByText(/prices are shown in USD/i)).toBeInTheDocument()
  })

  it('renders shipping and returns details', () => {
    renderLegal('shipping')

    expect(screen.getByRole('heading', { name: 'Shipping & Returns' })).toBeInTheDocument()
    expect(screen.getByText(/unopened products can be returned/i)).toBeInTheDocument()
  })
})
