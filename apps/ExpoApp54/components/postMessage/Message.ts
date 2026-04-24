export interface Message {
  id: string;
  text: string;
  from: 'native' | 'rn';
  timestamp: number;
}
