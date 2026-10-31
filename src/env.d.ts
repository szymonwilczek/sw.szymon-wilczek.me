interface AuTheme {
  ids: string[];
  get(): string;
  resolve(choice: string): string;
  set(choice: string): void;
  preview(id?: string): void;
  flood(choice: string): void;
  warm(): void;
  autoNote(): string;
  openPicker?: () => void;
}

interface Window {
  auTheme?: AuTheme;
}
