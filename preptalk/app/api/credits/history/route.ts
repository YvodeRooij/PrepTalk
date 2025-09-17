import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // TODO: Implement credit history retrieval from database
    // This would fetch user's credit transaction history
    
    const mockHistory = [
      {
        id: 1,
        type: 'purchase',
        amount: 50,
        description: 'Credit purchase - Professional package',
        date: '2024-12-15T10:00:00Z'
      },
      {
        id: 2,
        type: 'usage',
        amount: -3,
        description: 'Mock interview session',
        date: '2024-12-14T15:30:00Z'
      }
    ];
    
    return NextResponse.json({ 
      history: mockHistory,
      total: mockHistory.length 
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch credit history" },
      { status: 500 }
    );
  }
}
