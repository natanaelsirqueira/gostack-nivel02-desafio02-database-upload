import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(transactions: Transaction[]): Promise<Balance> {
    interface Acc {
      income: number;
      outcome: number;
    }

    const reducer = (acc: Acc, transaction: Transaction): Acc => {
      if (transaction.type === 'income') {
        return { income: acc.income + transaction.value, outcome: acc.outcome };
      }

      return { income: acc.income, outcome: acc.outcome + transaction.value };
    };

    const initial = { income: 0, outcome: 0 };

    const { income, outcome } = transactions.reduce(reducer, initial);

    return { income, outcome, total: income - outcome };
  }
}

export default TransactionsRepository;
