export class GameStore {
  money: number = 0;
  ownedDogs: number = 0;
  speedLevel: number = 0;
  whistles: number = 3;

  award(amount: number) {
    this.money += Math.max(0, Math.floor(amount));
  }

  tryBuyDog(cost: number): boolean {
    if (this.money >= cost) {
      this.money -= cost;
      this.ownedDogs += 1;
      return true;
    }
    return false;
  }

  tryBuySpeed(cost: number): boolean {
    if (this.money >= cost) {
      this.money -= cost;
      this.speedLevel += 1;
      return true;
    }
    return false;
  }
}


