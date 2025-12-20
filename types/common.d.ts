type Nominal = boolean | number | string;

type ToString<T extends Nominal> = `${T}`;
declare function tonumber(value: ToString<number>, base?: number): number;
declare function tostring<T>(value: T): T extends Nominal ? ToString<T> : string;
