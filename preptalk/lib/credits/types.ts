// Credit system types
export interface UserCredits {
  id: string;
  user_id: string;
  monthly_credits: number;
  bonus_credits: number;
  credits_used_this_month: number;
  current_period_start: string;
  current_period_end: string;
  last_credit_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  credit_type: CreditType;
  amount: number;
  description: string;
  related_entity_type?: string;
  related_entity_id?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
}

export type TransactionType = 
  | 'earned'
  | 'used'
  | 'purchased'
  | 'refunded'
  | 'expired'
  | 'reset';

export type CreditType = 'monthly' | 'bonus';

export interface CreditBalance {
  monthly_credits: number;
  bonus_credits: number;
  credits_used_this_month: number;
  total_available: number;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  price_id: string; // Stripe price ID
  popular?: boolean;
  description?: string;
}

export interface CreditUsageResult {
  success: boolean;
  remaining_credits?: number;
  error?: string;
}