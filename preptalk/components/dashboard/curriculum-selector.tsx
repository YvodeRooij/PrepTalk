'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Check, Building2, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { CurriculumListItem } from '@/lib/dashboard/data';

interface CurriculumSelectorProps {
  curricula: CurriculumListItem[];
  selectedId: string | null;
  currentCompany: string | null;
  currentJobTitle: string | null;
}

export function CurriculumSelector({
  curricula,
  selectedId,
  currentCompany,
  currentJobTitle,
}: CurriculumSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Don't show dropdown selector if only 1 curriculum, but show link to create new
  if (curricula.length <= 1) {
    return (
      <div className="w-full max-w-xs">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-6 text-blue-900">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            Applying to
          </p>
          <p className="mt-4 text-2xl font-semibold text-blue-900">
            {currentCompany ?? 'Your target company'}
          </p>
          {currentJobTitle && (
            <p className="mt-1 text-sm font-medium text-blue-800">{currentJobTitle}</p>
          )}
        </div>
        <a
          href="/curriculum"
          className="mt-2 flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Prepare for new role
        </a>
      </div>
    );
  }

  const handleSelect = (curriculumId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('curriculumId', curriculumId);
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedCurriculum = curricula.find(c => c.id === selectedId) || curricula[0];

  return (
    <div className="w-full max-w-xs relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-lg border border-blue-100 bg-blue-50 p-6 text-blue-900 hover:bg-blue-100 transition-colors text-left"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Select curriculum. Currently viewing ${selectedCurriculum.company_name}, ${selectedCurriculum.job_title}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
              Applying to
            </p>
            <p className="mt-4 text-2xl font-semibold text-blue-900 flex items-center gap-2">
              {selectedCurriculum.company_name || 'Untitled Curriculum'}
            </p>
            {selectedCurriculum.job_title && (
              <p className="mt-1 text-sm font-medium text-blue-800">
                {selectedCurriculum.job_title}
              </p>
            )}
            <p className="mt-2 text-xs text-blue-700">
              Last updated: {new Date(selectedCurriculum.updated_at).toISOString().split('T')[0]} · {selectedCurriculum.total_rounds} rounds
            </p>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-blue-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <ul role="listbox" className="py-2">
            {curricula.slice(0, 5).map((curriculum) => {
              const isCurrent = curriculum.id === selectedId;
              return (
                <li key={curriculum.id} role="option" aria-selected={isCurrent}>
                  <button
                    onClick={() => handleSelect(curriculum.id)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 w-5 h-5 mt-1">
                      {isCurrent && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <p className="text-base font-semibold text-gray-900 truncate">
                          {curriculum.company_name || 'Untitled Curriculum'}
                        </p>
                      </div>
                      {curriculum.job_title && (
                        <p className="text-sm text-gray-600 mt-0.5 truncate">
                          {curriculum.job_title}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(curriculum.updated_at).toISOString().split('T')[0]} · {curriculum.total_rounds} rounds
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}

            {/* New curriculum CTA */}
            <li className="border-t border-gray-100">
              <a
                href="/curriculum"
                className="flex items-center gap-3 px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Prepare for new role
              </a>
            </li>
          </ul>

          {curricula.length > 5 && (
            <div className="border-t border-gray-100 px-4 py-3">
              <a
                href="/dashboard/curricula"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all curricula ({curricula.length} total) →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
