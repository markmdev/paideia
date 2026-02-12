import { auth } from '@/lib/auth'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')
  const isOnLogin = req.nextUrl.pathname === '/login'
  const isOnRegister = req.nextUrl.pathname === '/register'
  const isOnApi = req.nextUrl.pathname.startsWith('/api')

  // Allow API routes
  if (isOnApi) return

  // Redirect logged-in users away from login/register
  if (isLoggedIn && (isOnLogin || isOnRegister)) {
    return Response.redirect(new URL('/dashboard', req.nextUrl))
  }

  // Protect dashboard routes
  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL('/login', req.nextUrl))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
