import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './state/AuthContext'
import { BookingProvider } from './state/BookingContext'
import { ThemeProvider } from './state/ThemeContext'

import './styles/tokens.css'
import './styles/primitives.css'
import './styles/layout.css'
import './styles/pages.css'
import './styles/owner.css'
// Last, so its [data-theme="dark"] overrides win on equal specificity.
import './styles/theme.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <BookingProvider>
            <App />
          </BookingProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
