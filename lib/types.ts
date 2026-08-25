export type Fish = {
  _id: string;
  name: string;
  url: string;
  logo: string;
  image?: string;   // optional image URL supplied by the buyer
  weight: number;      // dollars invested in this fish = its size
  hue: number;         // 0-360
  seed: number;        // deterministic swim pattern
  ownerKey?: string;   // never sent to clients
  createdAt: string;
  alive: boolean;
  kills?: number;
  eatenBy?: string;
  eatenById?: string;
  eatenAt?: string;
};

export type PublicFish = Omit<Fish, "ownerKey">;

export type Event = {
  _id: string;
  type: "spawn" | "feed" | "eat";
  text: string;
  amount: number;
  at: string;
};

export type StateResponse = {
  fish: PublicFish[];
  dead: PublicFish[];
  legends: PublicFish[];   // top 5 all time, alive or eaten
  events: Event[];
  biomass: number;     // total $ ever paid into the tank
  eaten: number;       // fish eaten so far
  demo: boolean;
};

export type Action =
  | { action: "spawn"; name: string; url: string; amount: number }
  | { action: "feed"; fishId: string; amount: number }
  | { action: "eat"; fishId: string; targetId: string; ownerKey: string };

export const MIN_SPAWN = 1;
export const MIN_FEED = 1;
export const EAT_PREMIUM = 1;

export function sizeFor(weight: number) {
  // log scale so a $1 fish is visible and a $200 fish is a monster, not a wall
  return Math.round(26 + 24 * Math.log2(1 + Math.max(0, weight)));
}
