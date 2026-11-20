import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'
import { useAuthStore } from '../lib/authStore'
import { apiData } from '../lib/api'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, apiData: vi.fn() }
})

const apiMock = vi.mocked(apiData)

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('Admin LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null })
    localStorage.clear()
  })

  it('rejects non-admin accounts', async () => {
    apiMock.mockResolvedValue({
      user: {
        id: 'u1',
        email: 'customer@example.com',
        firstName: 'Sophie',
        lastName: 'Lim',
        role: 'USER',
      },
      accessToken: 'access',
      refreshToken: 'refresh',
    })
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'customer@example.com')
    await user.type(screen.getByLabelText('Password'), 'User@lumiere123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This account does not have admin access.')
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('signs in the seeded admin and stores the session', async () => {
    apiMock.mockResolvedValue({
      user: {
        id: 'admin1',
        email: 'admin@lumiere.com',
        firstName: 'Calesta',
        lastName: 'Admin',
        role: 'ADMIN',
      },
      accessToken: 'access',
      refreshToken: 'refresh',
    })
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'admin@lumiere.com')
    await user.type(screen.getByLabelText('Password'), 'Admin@lumiere123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(useAuthStore.getState().user?.email).toBe('admin@lumiere.com'))
    expect(localStorage.getItem('calesta-admin-token')).toBe('access')
    expect(localStorage.getItem('calesta-admin-refresh')).toBe('refresh')
  })

  it('shows an API error returned during sign-in', async () => {
    apiMock.mockRejectedValue(new Error('Invalid email or password'))
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'wrong@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })
})
