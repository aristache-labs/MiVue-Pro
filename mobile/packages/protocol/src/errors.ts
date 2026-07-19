export class CameraProtocolError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "CameraProtocolError";
  }
}
