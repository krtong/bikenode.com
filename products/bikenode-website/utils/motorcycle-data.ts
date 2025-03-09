import { Motorcycle } from '../types/motorcycle';
import motorcycleData from '../data/motorcycles.json';

export function getAllMotorcycles(): Motorcycle[] {
  return motorcycleData as Motorcycle[];
}

export function getMotorcyclesByMake(make: string): Motorcycle[] {
  return getAllMotorcycles().filter(
    motorcycle => motorcycle.make.toLowerCase() === make.toLowerCase()
  );
}

export function getMotorcyclesByCategory(category: string): Motorcycle[] {
  return getAllMotorcycles().filter(
    motorcycle => motorcycle.category.toLowerCase() === category.toLowerCase()
  );
}
