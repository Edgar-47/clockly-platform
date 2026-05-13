export interface ApiError {
  detail?: string;
  status?: number;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiList<T> {
  items: T[];
}

export type ApiItem<K extends string, T> = {
  [P in K]: T;
};
