import { createClient } from '@/lib/supabase/client';
import type { 
  UserCredits, 
  CreditTransaction, 
  CreditBalance, 
  CreditUsageResult 
} from './types';

export class CreditManager {
  private supabase = createClient();

  /**
   * Get user's current credit balance
   */
  async getBalance(userId: string): Promise<CreditBalance | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_available_credits', { p_user_id: userId });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Initialize credits for new user
        await this.initializeUserCredits(userId);
        return {
          monthly_credits: 1,
          bonus_credits: 0,
          credits_used_this_month: 0,
          total_available: 1
        };
      }
      
      return data[0];
    } catch (error) {
      console.error('Error getting credit balance:', error);
      return null;
    }
  }

  /**
   * Use a credit for an action
   */
  async useCredit(
    userId: string, 
    description: string,
    entityType?: string,
    entityId?: string
  ): Promise<CreditUsageResult> {
    try {
      const { data, error } = await this.supabase
        .rpc('use_credit', {
          p_user_id: userId,
          p_description: description,
          p_entity_type: entityType,
          p_entity_id: entityId
        });
      
      if (error) throw error;
      
      if (!data) {
        return {
          success: false,
          error: 'Insufficient credits'
        };
      }

      // Get updated balance
      const balance = await this.getBalance(userId);
      
      return {
        success: true,
        remaining_credits: balance?.total_available || 0
      };
    } catch (error) {
      console.error('Error using credit:', error);
      return {
        success: false,
        error: 'Failed to use credit'
      };
    }
  }

  /**
   * Check if user has enough credits
   */
  async canUseCredits(userId: string, amount: number = 1): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return (balance?.total_available || 0) >= amount;
  }

  /**
   * Get credit transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Add credits to user account (for purchases/subscriptions)
   */
  async addCredits(
    userId: string,
    creditType: 'monthly' | 'bonus',
    amount: number,
    description: string,
    stripePaymentIntentId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('add_credits', {
          p_user_id: userId,
          p_credit_type: creditType,
          p_amount: amount,
          p_description: description,
          p_stripe_payment_intent_id: stripePaymentIntentId
        });
      
      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }

  /**
   * Initialize credits for a new user
   */
  private async initializeUserCredits(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          monthly_credits: 1, // Free tier default
          bonus_credits: 0,
          credits_used_this_month: 0
        });
      
      if (error && !error.message.includes('duplicate key')) {
        throw error;
      }
    } catch (error) {
      console.error('Error initializing user credits:', error);
    }
  }
}

// Export singleton instance
export const creditManager = new CreditManager();
