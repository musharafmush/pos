// Authentication utilities for Awesome Shop POS
import bcrypt from 'bcryptjs';

// Hash password with bcrypt
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password with hash
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// Synchronous versions for compatibility
export const hashPasswordSync = (password: string): string => {
  const saltRounds = 12;
  return bcrypt.hashSync(password, saltRounds);
};

export const comparePasswordSync = (password: string, hash: string): boolean => {
  return bcrypt.compareSync(password, hash);
};