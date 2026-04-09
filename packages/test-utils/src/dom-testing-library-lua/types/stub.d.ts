export type RegExpExecArray = Array<string> & {
	index?: number;
	input?: string;
	n: number;
};

export interface RegExp {
	exec: (input: string) => RegExpExecArray | undefined;
	test: (input: string) => boolean;
}

export interface Error {
	name: string;
	message: string;
	stack?: string;
}
