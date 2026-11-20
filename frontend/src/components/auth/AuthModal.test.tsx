import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import AuthModal from './AuthModal'
import { useAuthStore, useUIStore } from '../../lib/store'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const renderAuthModal = () => render(
  <BrowserRouter>
    <AuthModal />
  </BrowserRouter>,
)

describe('AuthModal', () => {
  beforeEach(() => {
    useUIStore.setState({ isAuthModalOpen: true, authMode: 'login' })
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('puts the Google CTA before the email form', () => {
    renderAuthModal()

    const google = screen.getByRole('button', { name: /continue with google/i })
    const email = screen.getByLabelText('Email Address*')

    expect(google.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('validates required login fields without calling the API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()
    renderAuthModal()

    await user.click(screen.getByRole('button', { name: 'LOGIN' }))

    expect(await screen.findByText('Email and password are required.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('signs in, stores the session, and shows success', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          user: { id: 'u1', email: 'sophie@example.com', firstName: 'Sophie', lastName: 'Lim', role: 'USER' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      }),
    )
    const user = userEvent.setup()
    renderAuthModal()

    await user.type(screen.getByLabelText('Email Address*'), 'sophie@example.com')
    await user.type(screen.getByLabelText('Password*'), 'User@lumiere123')
    await user.click(screen.getByRole('button', { name: 'LOGIN' }))

    expect(await screen.findByText('Logged in successfully.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(useAuthStore.getState().accessToken).toBe('access-token')
    expect(useAuthStore.getState().user?.email).toBe('sophie@example.com')
  })

  it('requires matching passwords and accepted terms on sign-up', async () => {
    useUIStore.setState({ authMode: 'signup' })
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()
    renderAuthModal()

    await user.type(screen.getByLabelText('First Name*'), 'Sophie')
    await user.type(screen.getByLabelText('Last Name*'), 'Lim')
    await user.type(screen.getByLabelText('Email Address*'), 'sophie@example.com')
    await user.type(screen.getByLabelText('Password*'), 'User@lumiere123')
    await user.type(screen.getByLabelText('Confirm Password*'), 'Different@123')
    await user.click(screen.getByRole('button', { name: 'SIGN UP' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the API error when sign-in is rejected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ success: false, message: 'Invalid email or password' }, 401),
    )
    const user = userEvent.setup()
    renderAuthModal()

    await user.type(screen.getByLabelText('Email Address*'), 'sophie@example.com')
    await user.type(screen.getByLabelText('Password*'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'LOGIN' }))

    await waitFor(() => expect(screen.getByText('Invalid email or password')).toBeInTheDocument())
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})
