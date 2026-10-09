import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from './database.config';

export default new DataSource(buildDatabaseOptions());
