'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { UserModel } from '@/types'

interface AuthContextType {
  user: User | null
  userModel: UserModel | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasPlatformAccess: () => boolean
  isPlatformAdmin: () => boolean
  isMasterAdmin: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userModel, setUserModel] = useState<UserModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Set up auth cookies for middleware
  const setAuthCookies = (user: User | null, userModel: UserModel | null) => {
    if (typeof document !== 'undefined') {
      if (user && userModel) {
        // Set auth token cookie (simplified - in production use proper JWT)
        document.cookie = `auth-token=${user.uid}; path=/; max-age=86400; SameSite=Lax`
        document.cookie = `user-role=${userModel.role.type}; path=/; max-age=86400; SameSite=Lax`
      } else {
        // Clear cookies
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
        document.cookie = 'user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setError(null)
      
      if (firebaseUser) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            
            // Check if user account is disabled
            if (!userData.isActive) {
              await signOut(auth)
              setError('Esta conta foi desativada. Entre em contato com o administrador.')
              setUserModel(null)
              setAuthCookies(null, null)
            } else {
              const userModelData: UserModel = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || undefined,
                photoURL: firebaseUser.photoURL || undefined,
                emailVerified: firebaseUser.emailVerified,
                role: userData.role || { type: 'atendente' },
                createdAt: userData.createdAt?.toDate(),
                lastSignInAt: userData.lastSignInAt?.toDate(),
                isActive: userData.isActive,
                metadata: userData.metadata || {}
              }
              setUserModel(userModelData)
              setAuthCookies(firebaseUser, userModelData)
            }
          } else {
            // User exists in Auth but not in Firestore
            const userModelData: UserModel = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || undefined,
              photoURL: firebaseUser.photoURL || undefined,
              emailVerified: firebaseUser.emailVerified,
              role: { type: 'atendente' },
              isActive: true,
              metadata: {}
            }
            setUserModel(userModelData)
            setAuthCookies(firebaseUser, userModelData)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          setError('Erro ao carregar dados do usuário')
          setUserModel(null)
          setAuthCookies(null, null)
        }
      } else {
        setUserModel(null)
        setAuthCookies(null, null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: unknown) {
      const errorCode = (error as { code?: string })?.code || 'unknown-error'
      setError(getAuthErrorMessage(errorCode))
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setUserModel(null)
      setAuthCookies(null, null)
    } catch {
      setError('Erro ao fazer logout')
    }
  }

  // Check if user has platform access (admin or atendente)
  const hasPlatformAccess = () => {
    return userModel?.role.type === 'admin' || userModel?.role.type === 'atendente'
  }

  // Check if user is platform admin
  const isPlatformAdmin = () => {
    return userModel?.role.type === 'admin'
  }

  // Check if user is master admin (initial admin)
  const isMasterAdmin = () => {
    return userModel?.role.type === 'admin' && userModel?.metadata?.isInitialAdmin === true
  }

  const authData: AuthContextType = {
    user,
    userModel,
    loading,
    error,
    login,
    logout,
    hasPlatformAccess,
    isPlatformAdmin,
    isMasterAdmin,
  }

  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'user-not-found':
      return 'Usuário não encontrado'
    case 'wrong-password':
      return 'Senha incorreta'
    case 'email-already-in-use':
      return 'Este e-mail já está em uso'
    case 'weak-password':
      return 'A senha é muito fraca'
    case 'invalid-email':
      return 'E-mail inválido'
    case 'user-disabled':
      return 'Esta conta foi desativada. Entre em contato com o administrador.'
    case 'too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde'
    case 'operation-not-allowed':
      return 'Operação não permitida'
    case 'invalid-credential':
      return 'Credenciais inválidas'
    default:
      return 'Erro de autenticação'
  }
}