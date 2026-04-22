export interface ApiError {
  detail: string;
  status: number;
}

export interface ApiList<T> {
  items: T[];
}

export interface ApiItem<K extends string, T> {
  [key: string]: T;
}
