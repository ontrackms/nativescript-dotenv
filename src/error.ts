export class ApplicationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
export class ValidationError extends ApplicationError {}
export class IntegrationError extends ApplicationError {}
export class ResourceRequiredError extends ApplicationError {}
