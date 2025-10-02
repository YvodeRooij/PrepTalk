import React from 'react';
import Link from 'next/link';
import { LogOut, Home, BookOpen, CreditCard, User, FileText } from 'lucide-react';
import { Toaster } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Toaster position="top-right" richColors />
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-blue-600">
                PrepTalk
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/curriculum"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  <BookOpen className="h-4 w-4" />
                  Curriculum
                </Link>
                <Link
                  href="/prep-guides"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  <FileText className="h-4 w-4" />
                  Prep Guides
                </Link>
                <Link
                  href="/credits"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  <CreditCard className="h-4 w-4" />
                  Credits
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <form action="/auth/signout" method="GET">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}
