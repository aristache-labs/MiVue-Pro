export class MiVueProtocolError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
    this.name = "MiVueProtocolError";
  }
}
