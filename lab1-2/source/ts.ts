export interface IUser {
    id: number;
    name: string;
    email?: string;
    isActive: boolean;
}

export function createUser(id: number, name: string, email?: string, isActive: boolean = true): IUser {
  return { id, name, email, isActive };
}

export type bookgenre = 'fiction' | 'non-fiction';

export interface IBook {
    title: string;
    author: string;
    year?: number;
    genre: bookgenre;
}

export function createBook(book: IBook): IBook{
return book;
}

export function calculateArea(shape: 'circle', radius: number): number;
export function calculateArea(shape: 'square', side: number): number;
export function calculateArea(shape: 'circle' | 'square', value: number): number{
    if (shape === 'circle') {
        return Math.PI * value * value;
    }else{
        return value * value;
    }

}

export type Status = 'active' | 'inactive' | 'new';

export function getStatusColor(status: Status): string{
    switch (status){
        case 'active' : return 'green';
        case 'inactive' : return 'red';
        case 'new' : return 'yellow';
    }
}

export type StringFormatter = (str: string, uppercase?: boolean) => string;

export const capitalLetter: StringFormatter = (str, uppercase = false) => {
  if (uppercase) return str.toUpperCase();
  
  const trimmed = str.trimStart();
  if (trimmed.length === 0) return str;
  
  const firstNonSpaceIndex = str.length - trimmed.length;
  return str.substring(0, firstNonSpaceIndex) + 
         trimmed.charAt(0).toUpperCase() + 
         trimmed.slice(1);
};

export const trimAndUppercase: StringFormatter = (str, uppercase = false) => {
  const trimmed = str.trim();
  return uppercase ? trimmed.toUpperCase() : trimmed;
};

export function getFirstElement<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[0] : undefined;
}

export interface HasId {
  id: number;
}

export function findById<T extends HasId>(items: T[], id: number): T | undefined {
  return items.find(item => item.id === id);
}