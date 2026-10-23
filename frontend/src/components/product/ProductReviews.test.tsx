import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProductReviews from './ProductReviews'
import { apiFetch } from '../../lib/api'
import { useAuthStore } from '../../lib/store'

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>()
  return { ...actual, apiFetch: vi.fn() }
})

const apiMock = apiFetch as unknown as ReturnType<typeof vi.fn>

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const approvedReview = {
  id: 'r1',
  rating: 5,
  title: 'My skin drinks it up',
  body: 'Two drops under moisturiser at night.',
  verified: true,
  approved: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  user: { firstName: 'Sophie', lastName: 'M', avatar: null },
}

const listBody = {
  success: true,
  data: [approvedReview],
  summary: { average: 5, total: 1, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 1 } },
  pagination: { page: 1, limit: 6, total: 1, totalPages: 1 },
}

const emptyBody = {
  success: true,
  data: [],
  summary: { average: 0, total: 0, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
  pagination: { page: 1, limit: 6, total: 0, totalPages: 0 },
}

beforeEach(() => {
  apiMock.mockReset()
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
})

describe('ProductReviews', () => {
  it('renders the rating summary, approved reviews, and the verified badge', async () => {
    apiMock.mockImplementation(async () => jsonResponse(listBody))

    render(<ProductReviews productId="p1" />)

    expect(await screen.findByText('My skin drinks it up')).toBeInTheDocument()
    expect(screen.getByText('Two drops under moisturiser at night.')).toBeInTheDocument()
    expect(screen.getByText('Sophie M.')).toBeInTheDocument()
    expect(screen.getByText('Verified purchase')).toBeInTheDocument()
    expect(screen.getByText('Based on 1 review')).toBeInTheDocument()
    expect(screen.getAllByText('5.0').length).toBeGreaterThan(0)

    expect(apiMock).toHaveBeenCalledWith('/api/reviews/product/p1?page=1&limit=6&sort=newest')
  })

  it('invites signed-out shoppers to sign in instead of showing the form', async () => {
    apiMock.mockImplementation(async () => jsonResponse(listBody))

    render(<ProductReviews productId="p1" />)

    expect(
      await screen.findByRole('button', { name: 'Sign in to write a review' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit review' })).not.toBeInTheDocument()
  })

  it('validates the rating and minimum review length before posting', async () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'sophie@example.com', firstName: 'Sophie', lastName: 'M', role: 'USER' },
      accessToken: 'token',
      refreshToken: 'refresh',
    })
    apiMock.mockImplementation(async (path: string) => {
      if (path.endsWith('/mine')) {
        return jsonResponse({
          success: true,
          data: { signedIn: true, review: null, canReview: true, purchased: false },
        })
      }
      return jsonResponse(emptyBody)
    })

    const user = userEvent.setup()
    render(<ProductReviews productId="p1" />)

    const bodyInput = await screen.findByPlaceholderText('What did you notice? Texture, scent, results…')
    const submit = screen.getByRole('button', { name: 'Submit review' })

    await user.type(bodyInput, 'Too short')
    await user.click(submit)
    expect(await screen.findByText('Choose a rating from 1 to 5 stars.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '4 out of 5 stars' }))
    await user.click(submit)
    expect(await screen.findByText('Please write at least 10 characters.')).toBeInTheDocument()

    const posted = apiMock.mock.calls.filter(([path]) => path === '/api/reviews')
    expect(posted).toHaveLength(0)
  })

  it('submits a trimmed review and shows the moderation state', async () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'sophie@example.com', firstName: 'Sophie', lastName: 'M', role: 'USER' },
      accessToken: 'token',
      refreshToken: 'refresh',
    })
    apiMock.mockImplementation(async (path: string, options: { method?: string; body?: string } = {}) => {
      if (path.endsWith('/mine')) {
        return jsonResponse({
          success: true,
          data: { signedIn: true, review: null, canReview: true, purchased: false },
        })
      }
      if (path === '/api/reviews' && options.method === 'POST') {
        const payload = JSON.parse(String(options.body))
        return jsonResponse(
          {
            success: true,
            data: { ...approvedReview, ...payload, approved: false, verified: false },
          },
          201
        )
      }
      return jsonResponse(emptyBody)
    })

    const user = userEvent.setup()
    render(<ProductReviews productId="p1" />)

    const bodyInput = await screen.findByPlaceholderText('What did you notice? Texture, scent, results…')
    const titleInput = screen.getByPlaceholderText('Sum it up in a few words')

    await user.click(screen.getByRole('button', { name: '5 out of 5 stars' }))
    await user.type(titleInput, 'Calm, not stripped')
    await user.type(bodyInput, '   A calm cleanser that never strips my skin.   ')
    await user.click(screen.getByRole('button', { name: 'Submit review' }))

    expect(await screen.findByText('Awaiting approval')).toBeInTheDocument()
    expect(
      screen.getByText('Thank you — your review is awaiting moderation and will appear shortly.')
    ).toBeInTheDocument()
    expect(screen.getByText('Calm, not stripped')).toBeInTheDocument()

    const posted = apiMock.mock.calls.find(([path]) => path === '/api/reviews')
    expect(posted).toBeTruthy()
    const payload = JSON.parse(String(posted?.[1]?.body))
    expect(payload).toEqual({
      productId: 'p1',
      rating: 5,
      title: 'Calm, not stripped',
      body: 'A calm cleanser that never strips my skin.',
    })
    expect(posted?.[1]?.token).toBe('token')
  })
})
