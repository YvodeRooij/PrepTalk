'use client';

import { useState, useEffect } from 'react';
import { CreditBalance } from '@/lib/credits/types';

interface CreditDisplayProps {
  showBuyMore?: boolean;
  showDetails?: boolean;
}

export function CreditDisplay({ showBuyMore = true, showDetails = false }: CreditDisplayProps) {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/credits/balance');
      
      if (!response.ok) {
        throw new Error('Failed to fetch credit balance');
      }
      
      const data = await response.json();
      setBalance(data);
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      setError('Failed to load credit balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchBalance}
          className="mt-2 text-red-700 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">No credit information available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Available Credits
          </h2>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {balance.total_available}
          </div>
          
          {showDetails && (
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Monthly Credits:</span>
                <span>{balance.monthly_credits}</span>
              </div>
              <div className="flex justify-between">
                <span>Bonus Credits:</span>
                <span>{balance.bonus_credits}</span>
              </div>
              <div className="flex justify-between">
                <span>Used This Month:</span>
                <span>{balance.credits_used_this_month}</span>
              </div>
            </div>
          )}
        </div>
        
        {showBuyMore && (
          <div className="flex flex-col gap-2">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Buy More Credits
            </button>
            {balance.total_available === 0 && (
              <p className="text-xs text-red-600 text-right">
                No credits remaining
              </p>
            )}
          </div>
        )}
      </div>
      
      {balance.total_available <= 2 && balance.total_available > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Low credits:</span> You have {balance.total_available} credit{balance.total_available === 1 ? '' : 's'} remaining.
          </p>
        </div>
      )}
    </div>
  );
}

export default CreditDisplay;