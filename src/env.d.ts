interface AuTheme {
  ids: string[];
  get(): string;
  resolve(choice: string): string;
  set(choice: string): void;
  preview(id?: string): void;
  openPicker?: () => void;
}

interface Window {
  auTheme?: AuTheme;
}
