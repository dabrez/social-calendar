'use client';

import { signIn, getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Clock } from 'lucide-react';

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push('/');
      }
    };
    checkSession();
  }, [router]);

  const handleSignIn = async (provider: string) => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: '/' });
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Social Calendar</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect your calendars and find time with friends and colleagues
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Users className="h-5 w-5 text-blue-500" />
              <span>See when your contacts are available</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Clock className="h-5 w-5 text-green-500" />
              <span>Smart meeting time suggestions</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Calendar className="h-5 w-5 text-purple-500" />
              <span>Integrate work and personal calendars</span>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button
              onClick={() => handleSignIn('google')}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => handleSignIn('azure-ad')}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#00BCF2" d="M0 0h11.377v11.372H0z"/>
                <path fill="#0078D4" d="M12.623 0H24v11.372H12.623z"/>
                <path fill="#00BCF2" d="M0 12.623h11.377V24H0z"/>
                <path fill="#FFB900" d="M12.623 12.623H24V24H12.623z"/>
              </svg>
              Continue with Microsoft
            </button>

            <div className="text-xs text-gray-500 text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}