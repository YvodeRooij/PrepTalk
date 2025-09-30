import Link from 'next/link';

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-600">
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-12 h-12"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We couldn&apos;t complete your sign-in request.
          </p>
          <div className="mt-4 text-left bg-gray-100 rounded-lg p-4">
            <p className="text-xs text-gray-700 mb-2">
              <strong>Possible reasons:</strong>
            </p>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>The authentication link expired</li>
              <li>You denied permission to access your Google account</li>
              <li>There was a network connection issue</li>
              <li>The authentication code was invalid</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/login"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </Link>

          <Link
            href="/"
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Home
          </Link>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Still having trouble?{' '}
            <a
              href="mailto:support@preptalk.com"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}