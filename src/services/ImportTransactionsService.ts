import { getCustomRepository, getRepository, In } from 'typeorm';
import parse from 'csv-parse';
import fs from 'fs';

import AppError from '../errors/AppError';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';

interface TransactionData {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

interface ParsedData {
  categories: string[];
  transactions: TransactionData[];
}

class ImportTransactionsService {
  async execute(csvFilePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionRepository);

    const {
      transactions,
      categories: categoriesTitles,
    } = await this.parseCsvData(csvFilePath);

    const categories = await this.findOrCreateCategories(categoriesTitles);

    const categoriesIndexedByTitle = new Map(
      categories.map(category => [category.title, category]),
    );

    const transactionsEntities = transactionsRepository.create(
      transactions.map(transaction => ({
        ...transaction,
        category: categoriesIndexedByTitle.get(transaction.category),
      })),
    );

    return transactionsRepository.save(transactionsEntities);
  }

  async parseCsvData(csvFilePath: string): Promise<ParsedData> {
    const categories: Set<string> = new Set();
    const transactions: TransactionData[] = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(parse({ delimiter: ', ', columns: true }))
        .on('data', async data => {
          categories.add(data.category);
          transactions.push({ ...data, value: parseFloat(data.value) });
        })
        .on('error', () => {
          reject(new AppError('Invalid file.'));
        })
        .on('end', resolve);
    });

    return { transactions, categories: Array.from(categories) };
  }

  async findOrCreateCategories(categories: string[]): Promise<Category[]> {
    const categoriesRepository = getRepository(Category);

    const existingCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });

    let categoriesToCreate = categories;

    if (existingCategories.length > 0) {
      categoriesToCreate = categories.filter(title => {
        return existingCategories.find(category => category.title !== title);
      });
    }

    const newCategories = await categoriesRepository.save(
      categoriesRepository.create(categoriesToCreate.map(title => ({ title }))),
    );

    return [...existingCategories, ...newCategories];
  }
}

export default ImportTransactionsService;
