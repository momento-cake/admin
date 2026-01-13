'use client'

import { useState, useEffect } from 'react'
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { UserModel } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [userModel, setUserModel] = useState<UserModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      setError(null)
      
      if (user) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            
            // Check if user account is disabled
            if (!userData.isActive) {
              await signOut(auth)
              setError('Esta conta foi desativada. Entre em contato com o administrador.')
              setUserModel(null)
            } else {
              setUserModel({
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || undefined,
                photoURL: user.photoURL || undefined,
                emailVerified: user.emailVerified,
                role: userData.role || { type: 'atendente' },
                createdAt: userData.createdAt?.toDate(),
                lastSignInAt: userData.lastSignInAt?.toDate(),
                isActive: userData.isActive,
                metadata: userData.metadata || {}
              })
            }
          } else {
            // User exists in Auth but not in Firestore
            setUserModel({
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || undefined,
              photoURL: user.photoURL || undefined,
              emailVerified: user.emailVerified,
              role: { type: 'atendente' },
              isActive: true,
              metadata: {}
            })
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          setError('Erro ao carregar dados do usuário')
          setUserModel(null)
        }
      } else {
        setUserModel(null)
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

  // Check if any admin users exist in the system
  const checkIfAdminsExist = async (): Promise<boolean> => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role.type', '==', 'admin'),
        where('isActive', '==', true)
      )
      const adminSnapshot = await getDocs(usersQuery)
      return !adminSnapshot.empty
    } catch (error) {
      console.error('Error checking for admin users:', error)
      return true // Assume admins exist if there's an error
    }
  }

  // Create the first admin user
  const createInitialAdmin = async (email: string, password: string, displayName: string) => {
    try {
      setError(null)
      
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Create user document in Firestore
      const userData: Omit<UserModel, 'uid'> = {
        email: user.email || '',
        displayName,
        emailVerified: user.emailVerified,
        role: {
          type: 'admin'
        },
        isActive: true,
        createdAt: new Date(),
        lastSignInAt: new Date(),
        metadata: {
          isInitialAdmin: true
        }
      }

      await setDoc(doc(db, 'users', user.uid), userData)
      
      return user
    } catch (error: unknown) {
      const errorCode = (error as { code?: string })?.code || 'unknown-error'
      setError(getAuthErrorMessage(errorCode))
      throw error
    }
  }

  return {
    user,
    userModel,
    loading,
    error,
    login,
    logout,
    hasPlatformAccess,
    isPlatformAdmin,
    isMasterAdmin,
    checkIfAdminsExist,
    createInitialAdmin
  }
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