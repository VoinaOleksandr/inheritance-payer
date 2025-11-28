export interface EstateInfo {
  id: number;
  executor: string;
  createdAt: number;
  finalized: boolean;
  active: boolean;
  name: string;
}

export interface EstateListItem {
  id: number;
  name: string;
  role: 'executor' | 'heir';
  finalized: boolean;
  active: boolean;
}

export interface HeirInfo {
  address: string;
  allocation: bigint | null;
  claimed: boolean;
}
