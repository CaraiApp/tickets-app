import supabase from './supabase';

export async function query(text, params = []) {
  // Convierte consultas SQL a operaciones Supabase
  console.log('Query simulada:', text, params);
  return [];
}