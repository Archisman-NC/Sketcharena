export class Player {
  public id: string;
  public name: string;
  public score: number;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.score = 0;
  }
}
