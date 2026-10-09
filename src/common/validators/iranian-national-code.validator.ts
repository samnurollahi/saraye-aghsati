import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsIranianNationalCode(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'isIranianNationalCode',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string' || !/^\d{10}$/.test(value)) {
            return false;
          }
          if (/^(\d)\1{9}$/.test(value)) {
            return false;
          }

          const check = Number(value[9]);
          const sum = value
            .slice(0, 9)
            .split('')
            .reduce(
              (total, digit, index) => total + Number(digit) * (10 - index),
              0,
            );
          const remainder = sum % 11;
          return remainder < 2 ? check === remainder : check === 11 - remainder;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} معتبر نیست.`;
        },
      },
    });
  };
}
